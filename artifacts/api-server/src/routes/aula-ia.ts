import { Router, Request, Response } from "express";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { requireAuth } from "../middlewares/requireAuth";
import { logAiUsage } from "../lib/aiCostLogger";
import { cacheGet, cacheSave } from "../lib/semanticCache";

const router = Router();

// ─── Clientes de IA ───────────────────────────────────────────────────────────
// OpenAI via Replit AI Integrations (principal — rápido e confiável)
const openai = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? process.env.OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

// Claude: primário para geração de conteúdo educacional (mais didático e criativo)
const claude = new Anthropic({
  apiKey: process.env.AI_INTEGRATIONS_ANTHROPIC_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_ANTHROPIC_BASE_URL,
  timeout: 45_000, // 45s — suficiente para aula completa com max_tokens reduzido
});

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

// ─── Gerar aula com Claude (melhor qualidade educacional) ─────────────────────
async function gerarAulaComClaude(topico: string, estilo: string, nivel: string): Promise<string> {
  const prof = difficultyProfile(estilo);
  const systemPrompt = `Você é o Professor Tiagão, tutor educacional brasileiro especialista em ${estilo}.

🎯 PÚBLICO-ALVO: ${prof.publico}
📊 NÍVEL DE DIFICULDADE: ${prof.nivelLabel}
⚖️ RIGOR EXIGIDO: ${prof.rigor}
🧪 TIPO DE EXEMPLO: ${prof.exemplos}
🗣️ VOCABULÁRIO: ${prof.vocabulario}

Crie uma aula DETALHADA e DIDÁTICA respeitando RIGOROSAMENTE o nível acima — o aluno escolheu este nível, então a aula DEVE soar diferente conforme a escolha. Cada etapa é escrita letra por letra na lousa — o aluno lê no ritmo da escrita, então use textos completos e explicativos.

ESTRUTURA DE CADA ETAPA:
1. "narracao": O que Tiagão FALA enquanto escreve (4-6 frases, coloquial PT-BR, animado, explica cada detalhe)
2. "elementos": O que aparece escrito na lousa (textos ricos, exemplos concretos)

REGRAS DA LOUSA:
- "titulo": nome/conceito principal da etapa (texto curto e claro)
- "texto": explicação completa em 1-2 frases (não seja vago, explique de verdade)
- "formula": só para fórmulas matemáticas/científicas reais
- "destaque": conceito-chave que o aluno DEVE memorizar
- "seta": item de lista/passo de um processo
- "exemplo": situação real ou exercício do ${estilo}
- "separador": divisão visual entre seções
- Use 4-7 elementos por etapa para uma lousa rica

REGRAS DE QUALIDADE:
- Narração: professor EXPLICA enquanto escreve, não só lê o que está na lousa
- Exemplos: sempre do contexto ${estilo} (ENEM 2023, vestibulares, situação do dia a dia)
- Linguagem: "Olha só...", "Repara que...", "Aqui está o pulo do gato:", "Isso cai muito no ENEM!"
- Máximo 6 etapas por aula, mínimo 4
- Nível adicional: ${nivel}
- IMPORTANTE: a aula DEVE refletir o nível "${prof.nivelLabel}" — se for Simples, NADA de questão de prova; se for Vestibular/Concurso, exija profundidade.

RETORNE SOMENTE JSON VÁLIDO, sem texto extra, sem markdown:
{
  "titulo": "string",
  "subtitulo": "string",
  "etapas": [
    {
      "id": 1,
      "narracao": "string — 4-6 frases explicativas em PT-BR coloquial e animado",
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
}`;

  const message = await claude.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 2500,
    messages: [
      {
        role: "user",
        content: `${systemPrompt}\n\nCrie uma aula sobre: ${topico.trim()}`,
      },
    ],
  });

  const block = message.content[0];
  logAiUsage({ feature: "lousa-aula", model: "claude-sonnet-4-6", tokensIn: message.usage?.input_tokens ?? 0, tokensOut: message.usage?.output_tokens ?? 0 });
  return block.type === "text" ? block.text : "{}";
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
    model: "gpt-4o-mini",
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

    let raw = "{}";
    let modelUsed = "claude-sonnet-4-6";
    // Claude é primário: conteúdo educacional mais didático e rico.
    // gpt-4o-mini como fallback rápido caso Claude ultrapasse o timeout.
    try {
      raw = await gerarAulaComClaude(topico, estilo, nivel);
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) raw = match[0];
    } catch (claudeErr) {
      console.warn("[aula-ia] Claude falhou, usando gpt-4o-mini como fallback:", claudeErr);
      modelUsed = "gpt-4o-mini";
      try {
        raw = await gerarAulaComOpenAI(topico, estilo, nivel);
      } catch (openaiErr) {
        console.error("[aula-ia] Ambos falharam — OpenAI:", openaiErr);
        throw openaiErr;
      }
    }

    const aula = JSON.parse(raw);

    // ── Salvar no cache para próximas requisições similares ──────────────────
    cacheSave("aula-ia", cacheKey, raw, modelUsed).catch(() => {});

    res.json(aula);
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
      const message = await claude.messages.create({
        model: "claude-haiku-4-5",
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `${systemContent}\n\nPergunta do aluno: ${pergunta}`,
          },
        ],
      });
      const block = message.content[0];
      resposta = block.type === "text" ? block.text : "";
      logAiUsage({ feature: "lousa-pergunta", model: "claude-haiku-4-5", tokensIn: message.usage?.input_tokens ?? 0, tokensOut: message.usage?.output_tokens ?? 0 });
    } catch {
      // Fallback para OpenAI mini
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemContent },
          { role: "user", content: pergunta },
        ],
        temperature: 0.8,
        max_tokens: 250,
      });
      resposta = completion.choices[0].message.content ?? "";
      logAiUsage({ feature: "lousa-pergunta", model: "gpt-4o-mini", tokensIn: completion.usage?.prompt_tokens ?? 0, tokensOut: completion.usage?.completion_tokens ?? 0 });
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

    const blob = new Blob([req.file.buffer], { type: req.file.mimetype || "audio/webm" });
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
