import { Router } from "express";
import OpenAI from "openai";
import { db } from "@workspace/db";
import { simuladoResultsTable, studyPlansTable } from "@workspace/db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();
// DeepSeek — muito mais barato que GPT-4o para geração de questões
const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY ?? "",
  baseURL: "https://api.deepseek.com",
});

const ADAPTIVE_SYSTEM_PROMPT = `Você é um professor especialista em aprendizado adaptativo, com foco em diagnóstico de lacunas de conhecimento.

IDIOMA OBRIGATÓRIO: SEMPRE em português brasileiro (pt-BR). NUNCA use inglês ou outro idioma — nem uma palavra sequer. Esta regra é absoluta.

Seu papel é criar um simulado CIRÚRGICO — não genérico. Com base no diagnóstico do histórico do aluno (taxa de acerto, padrões de erro, tópicos estudados), você vai gerar questões que intencionalmente testam as áreas onde o aluno COSTUMA ERRAR.

RESPONDA APENAS com um JSON válido, sem markdown:
{
  "titulo": "Simulado Adaptativo — [Matéria]: Foco em [Áreas Fracas]",
  "tempoMinutos": 25,
  "perguntas": [
    {
      "id": 1,
      "enunciado": "Questão focada na área fraca identificada",
      "opcoes": { "A": "...", "B": "...", "C": "...", "D": "..." },
      "correta": "B",
      "explicacao": "Explicação que reforça o conceito onde o aluno falha, com dica mnemônica ou analogia para fixar."
    }
  ]
}

REGRAS ABSOLUTAS:
- Foque nas áreas fracas identificadas no diagnóstico — não gere questões fáceis sobre o que o aluno já sabe
- Distribua dificuldade: Q1-Q2 conceito base (para confirmar a lacuna), Q3-Q7 aplicação direta da área fraca, Q8-Q10 situação-problema integrada
- Alternativas erradas devem ser plausíveis — reflitam erros típicos de quem tem essa lacuna
- Explicações devem ser didáticas e diretas, focando NO POR QUÊ do erro comum
- "correta" DEVE ser exatamente A, B, C ou D`;

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
      return res.status(400).json({ erro: "Matéria é obrigatória." });
    }

    const userId = (req.session as any)?.userId ?? req.user?.id;

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
    const rawContent = (conteudoTexto || "").trim().slice(0, 3000);
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

    const response = await openai.chat.completions.create({
      model: "deepseek-chat",
      messages: [
        { role: "system", content: ADAPTIVE_SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
      max_tokens: 8000,
      temperature: 0.9,
      response_format: { type: "json_object" },
    });

    const choice = response.choices[0];
    if (choice.finish_reason === "length") {
      return res.status(500).json({ erro: "Simulado muito longo. Tente novamente." });
    }

    const content = choice.message.content;
    if (!content) return res.status(500).json({ erro: "Resposta vazia da IA." });

    let simulado: unknown;
    try {
      simulado = JSON.parse(content);
    } catch {
      return res.status(500).json({ erro: "Formato inválido da IA. Tente novamente." });
    }

    return res.json({
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
    return res.status(500).json({ erro: "Erro ao gerar simulado adaptativo." });
  }
});

export default router;
