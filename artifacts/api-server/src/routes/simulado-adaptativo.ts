import { Router } from "express";
import { openai, OR } from "../lib/aiClient";
import { db } from "@workspace/db";
import { simuladoResultsTable, studyPlansTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";
import { logAiUsage } from "../lib/aiCostLogger";
import { isMathScienceSubject } from "../lib/modelRouter";

const router = Router();

const ADAPTIVE_SYSTEM_PROMPT = `Professor criador de simulado adaptativo em pt-BR. Responda SOMENTE JSON puro:
{"titulo":"Simulado Adaptativo — [Matéria]: Foco em [lacuna]","tempoMinutos":25,"perguntas":[{"id":1,"enunciado":"...","opcoes":{"A":"...","B":"...","C":"...","D":"..."},"correta":"B","explicacao":"Por que B. Dica para não errar de novo."}]}
REGRAS: Foque nas lacunas do diagnóstico. Q1-2 conceito base, Q3-7 aplicação, Q8-10 situação-problema. "correta"=A/B/C/D exato. Explicações em 1-2 frases.`;

function shuffleArray<T>(arr: T[]): T[] {
  return arr.map((v) => ({ v, sort: Math.random() })).sort((a, b) => a.sort - b.sort).map(({ v }) => v);
}

router.post("/simulado-adaptativo", async (req, res) => {
  try {
    const { materia, serie, diasConteudo, conteudoTexto } = req.body as {
      materia: string;
      serie: string;
      diasConteudo?: string;
      conteudoTexto?: string;
    };

    if (!materia) {
      return void res.status(400).json({ erro: "Matéria é obrigatória." });
    }

    const userId = ((req as any).session)?.userId ?? (req as any).user?.id;

    // ── Fetch student history ──────────────────────────────────
    let historico: {
      totalSimulados: number;
      avgScore: number;
      ultimaNota: number | null;
      tendencia: "melhorando" | "piorando" | "estavel";
      topicosEstudados: string[];
      diagnostico: string;
    } = {
      totalSimulados: 0,
      avgScore: 0,
      ultimaNota: null,
      tendencia: "estavel",
      topicosEstudados: [],
      diagnostico: "Primeiro simulado nesta matéria — gerando linha de base com foco nos conceitos fundamentais.",
    };

    if (userId) {
      const [simulados, plans] = await Promise.all([
        db
          .select()
          .from(simuladoResultsTable)
          .where(eq(simuladoResultsTable.userId, userId))
          .orderBy(simuladoResultsTable.createdAt),
        db
          .select()
          .from(studyPlansTable)
          .where(eq(studyPlansTable.userId, userId))
          .orderBy(desc(studyPlansTable.createdAt))
          .limit(10),
      ]);

      // Filter by matéria (fuzzy match)
      const materiaNorm = materia.toLowerCase().trim();
      const simsDaMateria = simulados.filter((s) =>
        s.materia.toLowerCase().trim().includes(materiaNorm) ||
        materiaNorm.includes(s.materia.toLowerCase().trim().split(" ")[0])
      );

      // Extract topics from all study plans for this subject
      const topicosSet = new Set<string>();
      for (const p of plans) {
        if (
          p.materia.toLowerCase().includes(materiaNorm) ||
          materiaNorm.includes(p.materia.toLowerCase().split(" ")[0])
        ) {
          const plan = p.plan as any;
          const dias = plan?.dias ?? [];
          for (const dia of dias) {
            const topicos = dia?.topicos ?? [];
            for (const t of topicos) {
              const nome = typeof t === "object" ? t?.nome : t;
              if (nome) topicosSet.add(String(nome));
            }
          }
        }
      }

      const topicosEstudados = Array.from(topicosSet).slice(0, 30);

      if (simsDaMateria.length > 0) {
        const scores = simsDaMateria.map((s) => Math.round((s.score / s.total) * 100));
        const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
        const ultima = scores[scores.length - 1];

        let tendencia: "melhorando" | "piorando" | "estavel" = "estavel";
        if (scores.length >= 3) {
          const half = Math.ceil(scores.length / 2);
          const primeiraMetade = scores.slice(0, half).reduce((a, b) => a + b, 0) / half;
          const segundaMetade = scores.slice(-half).reduce((a, b) => a + b, 0) / half;
          if (segundaMetade - primeiraMetade >= 8) tendencia = "melhorando";
          else if (primeiraMetade - segundaMetade >= 8) tendencia = "piorando";
        }

        // Build diagnostic text
        let diagnostico = `O aluno fez ${simsDaMateria.length} simulado(s) de ${materia}. `;
        diagnostico += `Média de acerto: ${avg}%. Última nota: ${ultima}%. Tendência: ${tendencia}. `;

        if (avg < 50) {
          diagnostico += `LACUNA GRAVE — o aluno erra mais da metade das questões. Foque nos conceitos MAIS BÁSICOS e fundamentos que costumam ser pré-requisito para tudo mais.`;
        } else if (avg < 65) {
          diagnostico += `LACUNA MODERADA — o aluno tem base mas erra questões de aplicação e situação-problema. Foque em exercícios de aplicação prática e interpretação.`;
        } else if (avg < 80) {
          diagnostico += `LACUNA PONTUAL — o aluno tem bom domínio geral mas comete erros em tópicos específicos. Foque nas "pegadinhas", exceções e casos especiais do conteúdo.`;
        } else {
          diagnostico += `DESEMPENHO ALTO — gere questões de alto nível: interpretação complexa, múltiplos conceitos integrados, situações inéditas. Desafie o aluno.`;
        }

        if (topicosEstudados.length > 0) {
          diagnostico += ` Tópicos que o aluno estudou: ${topicosEstudados.slice(0, 15).join(", ")}.`;
        }

        historico = { totalSimulados: simsDaMateria.length, avgScore: avg, ultimaNota: ultima, tendencia, topicosEstudados, diagnostico };
      } else if (topicosEstudados.length > 0) {
        historico.topicosEstudados = topicosEstudados;
        historico.diagnostico = `Primeiro simulado em ${materia}. O aluno já estudou os seguintes tópicos: ${topicosEstudados.slice(0, 15).join(", ")}. Teste esses tópicos de forma variada, priorizando aplicação.`;
      }
    }

    // ── Build adaptive prompt ──────────────────────────────────
    const rawContent = (conteudoTexto || "").trim().slice(0, 2000); // Reduced from 3000 — saves ~250 input tokens
    const hasContent = rawContent.length > 100;

    const targetDistribution = shuffleArray(["A","B","C","D","A","B","C","D","A","B"]).slice(0, 10);

    const userContent = `
DIAGNÓSTICO DO ALUNO:
${historico.diagnostico}

MATÉRIA: ${materia}
SÉRIE/NÍVEL: ${serie || "Não informado"}
${diasConteudo ? `TÓPICOS DO PLANO:\n${diasConteudo}\n` : ""}
${hasContent ? `MATERIAL DE ESTUDO (referência):\n${rawContent}\n` : ""}

DISTRIBUIÇÃO DAS RESPOSTAS CORRETAS: ${targetDistribution.map((l, i) => `Q${i + 1}→${l}`).join(", ")}

Gere EXATAMENTE 10 questões ADAPTATIVAS focadas nas lacunas identificadas no diagnóstico.
Escale dificuldade: Q1-Q2 fundamentos da lacuna, Q3-Q7 aplicação direta, Q8-Q10 integração e desafio.
`.trim();

    // Exatas → o1-mini (raciocínio matemático simbólico); demais → gpt-4o-mini
    const useMathModel = isMathScienceSubject(materia);
    const chosenModel = useMathModel ? "o1-mini" : "gpt-4o-mini";

    let response: Awaited<ReturnType<typeof openai.chat.completions.create>>;

    if (useMathModel) {
      // o1-mini: sem system role, sem temperature, sem response_format
      response = await openai.chat.completions.create({
        model: OR.reasoning,
        messages: [
          {
            role: "user",
            content: `${ADAPTIVE_SYSTEM_PROMPT}\n\n${userContent}\n\nRetorne SOMENTE JSON válido sem markdown.`,
          },
        ],
        max_completion_tokens: 3000,
      } as Parameters<typeof openai.chat.completions.create>[0]);
    } else {
      response = await openai.chat.completions.create({
        model: OR.fast,
        messages: [
          { role: "system", content: ADAPTIVE_SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        max_tokens: 3000,
        temperature: 0.9,
        response_format: { type: "json_object" },
      });
    }

    const respAny = response as any;
    logAiUsage({ feature: "simulado-adaptativo", model: chosenModel, tokensIn: respAny.usage?.prompt_tokens ?? 0, tokensOut: respAny.usage?.completion_tokens ?? 0 });

    const choice = respAny.choices[0];
    if (choice.finish_reason === "length") {
      return void res.status(500).json({ erro: "Simulado muito longo. Tente novamente." });
    }

    const content = choice.message.content;
    if (!content) return void res.status(500).json({ erro: "Resposta vazia da IA." });

    let simulado: unknown;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      simulado = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return void res.status(500).json({ erro: "Formato inválido da IA. Tente novamente." });
    }

    return void res.json({
      simulado,
      diagnostico: {
        totalSimulados: historico.totalSimulados,
        avgScore: historico.avgScore,
        ultimaNota: historico.ultimaNota,
        tendencia: historico.tendencia,
        topicosEstudados: historico.topicosEstudados.slice(0, 10),
      },
    });
  } catch (err) {
    console.error("Simulado adaptativo error:", err);
    return void res.status(500).json({ erro: "Erro ao gerar simulado adaptativo." });
  }
});

// ─── Diagnóstico Total — varre TODAS as matérias fracas e monta prova mista ──
router.post("/simulado-diagnostico-total", async (req, res) => {
  try {
    const userId = ((req as any).session)?.userId ?? (req as any).user?.id;
    if (!userId) {
      return void res.status(401).json({ erro: "Login necessário para o diagnóstico total." });
    }

    // 1. Busca TODO o histórico de simulados do aluno
    const simulados = await db
      .select()
      .from(simuladoResultsTable)
      .where(eq(simuladoResultsTable.userId, userId))
      .orderBy(desc(simuladoResultsTable.createdAt));

    if (simulados.length === 0) {
      return void res.status(400).json({
        erro: "Você ainda não fez nenhum simulado. Faça ao menos um simulado em qualquer matéria primeiro para o diagnóstico total funcionar!",
      });
    }

    // 2. Calcula desempenho por matéria
    const subjectMap: Record<string, { scores: number[]; materia: string }> = {};
    for (const s of simulados) {
      const key = s.materia.trim().toLowerCase();
      if (!subjectMap[key]) subjectMap[key] = { scores: [], materia: s.materia.trim() };
      const pct = s.total > 0 ? Math.round((s.score / s.total) * 100) : 0;
      subjectMap[key].scores.push(pct);
    }

    const allSubjects = Object.values(subjectMap).map((data) => ({
      materia: data.materia,
      avg: Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length),
      count: data.scores.length,
    })).sort((a, b) => a.avg - b.avg); // Mais fraco primeiro

    // 3. Separa fracas (abaixo de 70%) — se tudo >= 70%, usa todas
    let weakSubjects = allSubjects.filter((s) => s.avg < 70);
    if (weakSubjects.length === 0) weakSubjects = allSubjects;
    // Máximo de 5 matérias para não diluir demais
    weakSubjects = weakSubjects.slice(0, 5);

    // 4. Distribui 10 questões ponderadas pelo peso da fraqueza
    const totalWeight = weakSubjects.reduce((sum, s) => sum + Math.max(1, 100 - s.avg), 0);
    const rawDistribution = weakSubjects.map((s) => ({
      materia: s.materia,
      avg: s.avg,
      weight: Math.max(1, Math.round(((100 - s.avg) / totalWeight) * 10)),
    }));

    // Ajusta para garantir exatamente 10 questões
    let totalQ = rawDistribution.reduce((sum, d) => sum + d.weight, 0);
    while (totalQ < 10) { rawDistribution[0].weight++; totalQ++; }
    while (totalQ > 10) { rawDistribution[rawDistribution.length - 1].weight = Math.max(1, rawDistribution[rawDistribution.length - 1].weight - 1); totalQ--; }
    const distribution = rawDistribution.filter((d) => d.weight > 0);

    // 5. Gera o simulado misto com GPT
    const distribStr = distribution
      .map((d) => `- ${d.materia}: ${d.weight} questão(ões) | Desempenho atual: ${d.avg}% → foque nas maiores lacunas`)
      .join("\n");

    const systemPrompt = `Você é um professor elaborador de simulados diagnósticos multidisciplinares para o ENEM e vestibulares brasileiros.
Crie EXATAMENTE as questões especificadas abaixo, na quantidade exata por matéria, MISTURADAS no array.
Responda SOMENTE JSON puro, sem markdown:
{"titulo":"Diagnóstico Total — Matérias Fracas","tempoMinutos":25,"perguntas":[{"id":1,"materia":"Nome da Matéria","enunciado":"...","opcoes":{"A":"...","B":"...","C":"...","D":"..."},"correta":"B","explicacao":"..."}]}
REGRAS: "correta" deve ser A, B, C ou D exato. Explicações em 2 frases: por que a correta é certa + dica para não errar de novo. Questões contextualizadas, nível ENEM. Campo "materia" obrigatório em cada questão.`;

    const userContent = `DISTRIBUIÇÃO DE QUESTÕES (baseada em desempenho histórico real do aluno):
${distribStr}

Total: 10 questões misturadas de ${distribution.length} matéria(s) diferente(s).
Para cada matéria, gere questões focadas nos conceitos mais cobrados onde o aluno tem lacuna.
Escale: conceito base → aplicação → situação-problema dentro de cada matéria.`;

    const aiResponse = await openai.chat.completions.create({
      model: OR.fast,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      max_tokens: 4000,
      temperature: 0.8,
      response_format: { type: "json_object" },
    });

    logAiUsage({
      feature: "simulado-diagnostico-total",
      model: OR.fast,
      tokensIn: aiResponse.usage?.prompt_tokens ?? 0,
      tokensOut: aiResponse.usage?.completion_tokens ?? 0,
    });

    const content = aiResponse.choices[0]?.message?.content;
    if (!content) return void res.status(500).json({ erro: "Resposta vazia da IA." });

    let simulado: unknown;
    try {
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      simulado = JSON.parse(jsonMatch ? jsonMatch[0] : content);
    } catch {
      return void res.status(500).json({ erro: "Formato inválido da IA. Tente novamente." });
    }

    return void res.json({
      simulado,
      diagnostico: {
        totalSimulados: simulados.length,
        totalMateriasAnalisadas: allSubjects.length,
        avgScore: Math.round(allSubjects.reduce((a, b) => a + b.avg, 0) / allSubjects.length),
        ultimaNota: null,
        tendencia: "estavel" as const,
        topicosEstudados: [],
        materiasFracas: weakSubjects.map((s) => ({ materia: s.materia, avg: s.avg })),
        distribuicao: distribution,
      },
    });
  } catch (err) {
    console.error("Simulado diagnóstico total error:", err);
    return void res.status(500).json({ erro: "Erro ao gerar diagnóstico. Tente novamente." });
  }
});

export default router;
