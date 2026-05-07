import { Router, Request, Response } from "express";
import { openai, openrouter, OR } from "../lib/aiClient";
import { requireAuth } from "../middlewares/requireAuth";
import { logAiUsage } from "../lib/aiCostLogger";
import { cacheGet, cacheSave } from "../lib/semanticCache";
import { incrementTopicFrequency } from "../lib/generativeMemory";

const router = Router();

// ─── Calibração de dificuldade conforme o estilo escolhido pelo aluno ─────────
function difficultyProfile(estilo: string): {
  nivelLabel: string;
  publico: string;
  rigor: string;
  exemplos: string;
  vocabulario: string;
} {
  const e = (estilo || "").toLowerCase();
  if (e.includes("simples") || e.includes("fundamental") || e.includes("básic")) {
    return {
      nivelLabel: "iniciante (Ensino Fundamental / introdução total ao tema)",
      publico: "alunos do Fundamental II ou que estão vendo o assunto pela primeira vez",
      rigor: "BAIXO — explique como se fosse para uma criança de 12 anos. Sem jargão. Use analogias do dia a dia.",
      exemplos: "exemplos cotidianos (cozinha, futebol, redes sociais, jogos). NÃO use questões de prova.",
      vocabulario: "palavras simples, frases curtas, evite termos técnicos sem explicar.",
    };
  }
  if (e.includes("vestibular") || e.includes("fuvest") || e.includes("unicamp") || e.includes("ita")) {
    return {
      nivelLabel: "avançado (Vestibulares de elite — FUVEST, UNICAMP, ITA, UNESP)",
      publico: "candidatos que já dominam o básico e querem profundidade conceitual",
      rigor: "ALTO — exija demonstrações, justifique fórmulas, mostre casos limites e pegadinhas clássicas.",
      exemplos: "questões reais de FUVEST/UNICAMP/ITA dos últimos 5 anos. Cite o ano e a banca.",
      vocabulario: "vocabulário técnico-acadêmico, mas sempre explicado na primeira ocorrência.",
    };
  }
  if (e.includes("concurso") || e.includes("cespe") || e.includes("cebraspe") || e.includes("fcc")) {
    return {
      nivelLabel: "concurso público (estilo CEBRASPE/CESPE, FCC, FGV, VUNESP)",
      publico: "concurseiros que precisam de objetividade e pegadinhas de banca",
      rigor: "ALTO no detalhe legal/normativo. Foco em literalidade, exceções e jurisprudência quando cabível.",
      exemplos: "itens estilo CEBRASPE (Certo/Errado) e múltipla escolha FCC. Mostre a pegadinha típica.",
      vocabulario: "linguagem formal, técnica, com referências a leis/normas quando aplicável.",
    };
  }
  // Default = ENEM
  return {
    nivelLabel: "médio-ENEM (Ensino Médio com olhar para o ENEM)",
    publico: "estudantes do 2º/3º ano do EM que vão prestar ENEM",
    rigor: "MÉDIO — equilibre conceito e aplicação. Mostre interdisciplinaridade (a marca do ENEM).",
    exemplos: "questões reais do ENEM (2018-2024). Cite o ano. Destaque a habilidade BNCC quando possível.",
    vocabulario: "claro, contextualizado, sempre conectando à realidade brasileira.",
  };
}

// ─── Utilitário: tenta extrair JSON válido de uma string ──────────────────────
function extractJson(raw: string): string | null {
  if (!raw || raw.trim() === "") return null;
  // Tenta extrair o maior bloco {...} da resposta
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  const candidate = match[0];
  try {
    JSON.parse(candidate);
    return candidate;
  } catch {
    // JSON truncado — tenta fechar arrays/objetos abertos
    return tryRepairJson(candidate);
  }
}

function tryRepairJson(s: string): string | null {
  // Rastreia a pilha de abre-brackets para fechar na ordem correta
  const stack: string[] = [];
  let inString = false;
  let escape = false;
  for (const ch of s) {
    if (escape) { escape = false; continue; }
    if (ch === "\\" && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === "{") stack.push("}");
    else if (ch === "[") stack.push("]");
    else if (ch === "}" || ch === "]") stack.pop();
  }
  if (stack.length === 0) return null; // Balanceado — parse já deveria ter funcionado
  let repaired = s;
  if (inString) repaired += '"'; // Fecha string aberta
  // Fecha na ordem inversa da pilha
  while (stack.length) repaired += stack.pop();
  try {
    JSON.parse(repaired);
    return repaired;
  } catch {
    return null;
  }
}

// ─── Gerar aula com Claude (melhor qualidade educacional) ─────────────────────
async function gerarAulaComClaude(topico: string, estilo: string, nivel: string): Promise<string> {
  const prof = difficultyProfile(estilo);
  const systemPrompt = `Você é o Professor Tiagão, tutor educacional brasileiro especialista em ${estilo}.

🎯 PÚBLICO-ALVO: ${prof.publico}
📊 NÍVEL DE DIFICULDADE: ${prof.nivelLabel}
⚖️ RIGOR EXIGIDO: ${prof.rigor}
🧪 TIPO DE EXEMPLO: ${prof.exemplos}
🗣️ VOCABULÁRIO: ${prof.vocabulario}

Crie uma aula DETALHADA e DIDÁTICA respeitando RIGOROSAMENTE o nível acima.
Cada etapa é escrita letra por letra na lousa — use textos completos e explicativos.

ESTRUTURA DE CADA ETAPA:
1. "narracao": O que Tiagão FALA enquanto escreve (4-6 frases, coloquial PT-BR, animado)
2. "elementos": O que aparece escrito na lousa (textos ricos, exemplos concretos)

TIPOS DE ELEMENTO: titulo, texto, formula, destaque, seta, exemplo, separador
Use 4-7 elementos por etapa. Mínimo 4 etapas, máximo 5.

REGRAS DE QUALIDADE:
- Narração: professor EXPLICA, não só lê o que está na lousa
- Linguagem: "Olha só...", "Repara que...", "Isso cai muito no ENEM!"
- Nível: ${nivel}. IMPORTANTE: reflita rigorosamente "${prof.nivelLabel}".

RETORNE SOMENTE JSON VÁLIDO, sem texto extra, sem markdown, sem blocos de código:
{
  "titulo": "string",
  "subtitulo": "string",
  "etapas": [
    {
      "id": 1,
      "narracao": "4-6 frases em PT-BR coloquial",
      "elementos": [
        { "tipo": "titulo", "texto": "string" },
        { "tipo": "texto", "texto": "string" },
        { "tipo": "destaque", "texto": "string" }
      ],
      "duracao": 30
    }
  ]
}`;

  const completion = await openrouter.chat.completions.create({
    model: OR.claude,
    max_tokens: 2000,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Crie uma aula sobre: ${topico.trim()}` },
    ],
  });

  const content = completion.choices[0]?.message?.content ?? "";
  logAiUsage({ feature: "lousa-aula", model: OR.claude, tokensIn: completion.usage?.prompt_tokens ?? 0, tokensOut: completion.usage?.completion_tokens ?? 0 });
  const extracted = extractJson(content);
  if (!extracted) throw new Error("Modelo retornou JSON inválido ou vazio");
  return extracted;
}

// ─── Gerar aula com OpenAI gpt-4o-mini (primário — rápido e confiável) ────────
async function gerarAulaComOpenAI(topico: string, estilo: string, nivel: string): Promise<string> {
  const prof = difficultyProfile(estilo);
  const systemPrompt = `Você é o Professor Tiagão, tutor educacional brasileiro especialista em ${estilo}.
Público: ${prof.publico}. Nível: ${prof.nivelLabel}. Rigor: ${prof.rigor}. Exemplos: ${prof.exemplos}. Vocabulário: ${prof.vocabulario}.
Crie uma aula DETALHADA e DIDÁTICA em JSON. Retorne APENAS o JSON, sem texto extra.
{
  "titulo": "string",
  "subtitulo": "string",
  "etapas": [
    {
      "id": 1,
      "narracao": "4-6 frases explicativas em PT-BR coloquial",
      "elementos": [
        { "tipo": "titulo", "texto": "string" },
        { "tipo": "texto", "texto": "string" },
        { "tipo": "destaque", "texto": "string" },
        { "tipo": "seta", "texto": "string" },
        { "tipo": "exemplo", "texto": "string" }
      ],
      "duracao": 30
    }
  ]
}
Nível: ${nivel}. Máx 6 etapas, mín 4. Exemplos do contexto ${estilo}. RESPEITE rigorosamente o nível "${prof.nivelLabel}".`;

  const completion = await openai.chat.completions.create({
    model: OR.fast,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: `Crie uma aula sobre: ${topico.trim()}` },
    ],
    temperature: 0.7,
    response_format: { type: "json_object" },
    max_tokens: 3000,
  });

  logAiUsage({ feature: "lousa-aula", model: "gpt-4o-mini", tokensIn: completion.usage?.prompt_tokens ?? 0, tokensOut: completion.usage?.completion_tokens ?? 0 });
  return completion.choices[0].message.content ?? "{}";
}

// ─── Gerar aula estruturada para a lousa ─────────────────────────────────────
router.post("/aula-ia/gerar", requireAuth, async (req: Request, res: Response) => {
  try {
    const { topico, estilo = "ENEM", nivel = "médio" } = req.body as {
      topico: string;
      estilo?: string;
      nivel?: string;
    };

    if (!topico?.trim()) {
      res.status(400).json({ erro: "topico é obrigatório" });
      return;
    }

    // ── Nível 1-3: Verificar cache semântico antes de chamar IA ──────────────
    const cacheKey = `${topico.trim()}|${estilo}|${nivel}`;
    const cached = await cacheGet("aula-ia", cacheKey);
    if (cached.hit) {
      console.info(`[aula-ia] cache ${cached.level} (sim=${cached.similarity?.toFixed(3) ?? "exact"})`);
      const aulaFromCache = JSON.parse(cached.response);
      res.json({ ...aulaFromCache, _cacheLevel: cached.level });
      return;
    }

    // ── Geração: Claude primary, GPT-4o-mini fallback ──
    let raw = "";
    let modelUsed = "claude-sonnet-4-5";

    try {
      raw = await gerarAulaComClaude(topico, estilo, nivel);
    } catch (claudeErr) {
      console.warn("[aula-ia] Claude falhou, usando fallback GPT-4o-mini:", claudeErr);
      try {
        raw = await gerarAulaComOpenAI(topico, estilo, nivel);
        modelUsed = "gpt-4o-mini";
      } catch (openaiErr) {
        throw new Error("Ambos os modelos falharam ao gerar a aula");
      }
    }

    // ── Parse robusto — nunca crasha, sempre tenta recuperar ─────────────────
    let aula: Record<string, any>;
    try {
      aula = JSON.parse(raw);
    } catch {
      // Tenta extrair/reparar JSON truncado
      const repaired = extractJson(raw);
      if (repaired) {
        console.warn("[aula-ia] JSON reparado com sucesso");
        aula = JSON.parse(repaired);
      } else {
        throw new Error("JSON inválido após todas as tentativas");
      }
    }

    // ── Valida estrutura mínima ───────────────────────────────────────────────
    if (!aula.titulo || !Array.isArray(aula.etapas) || aula.etapas.length === 0) {
      throw new Error("Estrutura de aula inválida — sem titulo ou etapas");
    }

    // ── Salvar no cache (usa JSON válido final) ───────────────────────────────
    const finalJson = JSON.stringify(aula);
    cacheSave("aula-ia", cacheKey, finalJson, modelUsed).catch(() => {});

    res.json(aula);

    // ── Track topic in generative memory (fire-and-forget) ───────────────────
    if ((req as any).userId) {
      const materia = (aula.materia as string) || aula.subtitulo?.split(" ")[0] || "Geral";
      incrementTopicFrequency((req as any).userId, topico.trim(), materia).catch(() => {});
    }
  } catch (err) {
    console.error("[aula-ia/gerar]", err);
    res.status(500).json({ erro: "Erro ao gerar aula" });
  }
});

// ─── Pergunta durante a aula (Claude — resposta curta e didática) ─────────────
router.post("/aula-ia/pergunta", requireAuth, async (req: Request, res: Response) => {
  try {
    const { pergunta, topico, contexto } = req.body as {
      pergunta: string;
      topico: string;
      contexto?: string;
    };

    if (!pergunta?.trim()) {
      res.status(400).json({ erro: "pergunta é obrigatória" });
      return;
    }

    const systemContent = `Você é o Professor Tiagão, tutor brasileiro animado e didático.
O aluno está assistindo uma aula sobre "${topico}".
${contexto ? `Contexto da aula atual: ${contexto}` : ""}
Responda a pergunta de forma CURTA e direta (máximo 4 frases).
Use linguagem coloquial PT-BR, seja animado e motivador.
Não use markdown nem listas. Termine com uma frase de encorajamento.`;

    let resposta = "";

    try {
      const completion = await openrouter.chat.completions.create({
        model: OR.mini,
        max_tokens: 300,
        temperature: 0.8,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: pergunta },
        ],
      });
      resposta = completion.choices[0]?.message?.content ?? "";
      logAiUsage({ feature: "lousa-pergunta", model: OR.mini, tokensIn: completion.usage?.prompt_tokens ?? 0, tokensOut: completion.usage?.completion_tokens ?? 0 });
    } catch {
      // Fallback para openai direto
      const completion = await openai.chat.completions.create({
        model: OR.fast,
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: pergunta },
        ],
        temperature: 0.8,
        max_tokens: 250,
      });
      resposta = completion.choices[0].message.content ?? "";
      logAiUsage({ feature: "lousa-pergunta", model: OR.fast, tokensIn: completion.usage?.prompt_tokens ?? 0, tokensOut: completion.usage?.completion_tokens ?? 0 });
    }

    res.json({ resposta });
  } catch (err) {
    console.error("[aula-ia/pergunta]", err);
    res.status(500).json({ erro: "Erro ao responder" });
  }
});

// ─── Transcrição de voz (Whisper) para perguntas por voz ─────────────────────
import multer from "multer";
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/aula-ia/transcrever", requireAuth, upload.single("audio"), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ erro: "Arquivo de áudio não enviado" });
      return;
    }

    const blob = new Blob([new Uint8Array(req.file.buffer)], { type: req.file.mimetype || "audio/webm" });
    const file = new File([blob], "audio.webm", { type: req.file.mimetype || "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "pt",
      response_format: "text",
    });

    res.json({ texto: transcription });
  } catch (err) {
    console.error("[aula-ia/transcrever]", err);
    res.status(500).json({ erro: "Erro na transcrição" });
  }
});

export default router;
