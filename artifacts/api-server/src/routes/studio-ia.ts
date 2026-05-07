/**
 * /api/studio-ia — Geradores topic-based para Professor + Instituições
 *
 * Diferente de /api/notebook/* (que precisa de docId), aqui o input é
 * { topico, materia, nivel } e a IA gera tudo do zero.
 *   - POST /studio-ia/infografico   → b64 image
 *   - POST /studio-ia/mapa-mental   → 4-level mapa (subject → categories → topics → subtopics)
 *   - POST /studio-ia/slides        → slides + (opcional) imagens IA por slide
 *
 * 🧠 Estratégia de IA:
 *   - SLIDES / MAPA MENTAL / INFOGRÁFICO: Claude Sonnet via OpenRouter (generateWithGemini)
 *   - Fallback: GPT-4o via OpenRouter
 *   - IMAGENS: gpt-image-1 quality="high"
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { openai as gpt, OR, generateWithGemini } from "../lib/aiClient";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";
import { saveGeneratedContent } from "../lib/contentHistory";
import { cacheGet, cacheSave } from "../lib/semanticCache";

const router: IRouter = Router();

function ensureAuth(req: Request, res: Response): boolean {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return false; }
  return true;
}

function jsonClean(raw: string): string {
  return raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

function extractJson(raw: string): string {
  const cleaned = jsonClean(raw);
  try { JSON.parse(cleaned); return cleaned; } catch {}
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) {
    try { JSON.parse(match[0]); return match[0]; } catch {}
  }
  return cleaned;
}

// ─── POST /api/studio-ia/mapa-mental ─────────────────────────────────────────
router.post("/studio-ia/mapa-mental", async (req: Request, res: Response) => {
  if (!ensureAuth(req, res)) return;
  const { topico, materia = "Geral", nivel = "ENEM" } = req.body as {
    topico: string; materia?: string; nivel?: string;
  };
  if (!topico?.trim()) { res.status(400).json({ erro: "Tópico obrigatório" }); return; }

  const ckMapa = `mapa-mental|${materia}|${topico}|${nivel}`;
  const cachedMapa = await cacheGet("mapa-mental", ckMapa);
  if (cachedMapa.hit) {
    try { res.json(JSON.parse(cachedMapa.response)); return; } catch { /* gera novo */ }
  }

  try {
    const system = `Você é um curador pedagógico brasileiro de elite, especialista em ${nivel}.
Sua missão: criar mapas mentais HIERÁRQUICOS de 4 níveis com profundidade real, alinhados ao currículo BNCC.

Retorne EXCLUSIVAMENTE JSON válido — nada de markdown, comentários ou prosa antes/depois:
{
  "subject": "Tema central (max 4 palavras)",
  "categories": [
    {
      "name": "Categoria nível 2 (max 4 palavras)",
      "topics": [
        {
          "name": "Tópico nível 3 (max 5 palavras)",
          "subtopics": [
            { "name": "Subtópico folha (max 6 palavras)", "detail": "1-2 frases factuais e precisas" }
          ]
        }
      ]
    }
  ]
}

Regras OBRIGATÓRIAS:
- 3 a 4 categorias principais (eixos conceituais distintos)
- 2 a 4 tópicos por categoria (sem sobreposição)
- 3 a 5 subtópicos por tópico (granularidade fina)
- Detail factual, sem inventar dados, datas, nomes ou fórmulas
- Conteúdo alinhado ao currículo brasileiro / BNCC
- Linguagem clara, acadêmica mas acessível`;

    const user = `Matéria: ${materia}\nTema: ${topico}\nGere o mapa mental completo agora.`;
    const raw = await generateWithGemini(system, user, 4000);
    const parsed = JSON.parse(extractJson(raw));
    if (parsed.topics && !parsed.categories) {
      parsed.categories = [{ name: parsed.subject, topics: parsed.topics }];
    }
    cacheSave("mapa-mental", ckMapa, JSON.stringify(parsed), OR.claude).catch(() => {});
    if (req.userId) {
      saveGeneratedContent({
        ownerId: req.userId, ownerRole: "student",
        kind: "mapa_mental",
        title: parsed.subject || topico,
        materia,
        payload: parsed,
      }).catch(() => {});
    }
    res.json(parsed);
  } catch (e) {
    console.error("studio-ia mapa-mental:", e);
    res.status(500).json({ erro: "Erro ao gerar mapa mental" });
  }
});

// ─── POST /api/studio-ia/infografico ─────────────────────────────────────────
router.post("/studio-ia/infografico", async (req: Request, res: Response) => {
  if (!ensureAuth(req, res)) return;
  const { topico, materia = "Geral", nivel = "ENEM", estilo = "profissional", orientacao = "retrato" } = req.body as {
    topico: string; materia?: string; nivel?: string;
    estilo?: "kawaii" | "profissional" | "cientifico" | "anime" | "esboco" | "minimalista";
    orientacao?: "quadrado" | "paisagem" | "retrato";
  };
  if (!topico?.trim()) { res.status(400).json({ erro: "Tópico obrigatório" }); return; }

  const ckInfo = `infografico|${materia}|${topico}|${nivel}|${estilo}|${orientacao}`;
  const cachedInfo = await cacheGet("infografico", ckInfo);
  if (cachedInfo.hit) {
    try { res.json(JSON.parse(cachedInfo.response)); return; } catch { /* gera novo */ }
  }

  try {
    const briefSystem = `Você é diretor de arte sênior de uma editora educacional premium criando o briefing de um infográfico sobre "${topico}" (${materia}, nível ${nivel}).

Retorne EXCLUSIVAMENTE JSON válido (sem markdown, sem prosa):
{
  "titulo": "Título principal (max 8 palavras, impactante)",
  "subtitulo": "Subtítulo (max 15 palavras, contextualiza)",
  "secoes": [
    { "rotulo": "Nome (max 4 palavras)", "elementos": ["fato 1 conciso", "fato 2", "fato 3"] }
  ],
  "icones_chave": ["substantivo concreto 1", "substantivo concreto 2", "substantivo concreto 3"]
}

Regras:
- 3 a 4 seções com hierarquia narrativa clara
- 3 a 5 elementos por seção, frases curtas e precisas
- Conteúdo factual, alinhado ao currículo BNCC
- Ícones = substantivos concretos visualizáveis (não conceitos abstratos)`;

    const briefRaw = await generateWithGemini(briefSystem,
      `Crie o briefing do infográfico sobre "${topico}" da matéria ${materia}.`, 2000);
    const brief = JSON.parse(extractJson(briefRaw));

    const styleSheet: Record<string, string> = {
      kawaii: "ultra cute kawaii illustration style, pastel colors, soft rounded shapes, smiling characters, hand-drawn outlines, sparkles, friendly playful mood",
      profissional: "modern flat infographic design, clean vector illustration, balanced composition, sophisticated palette (deep indigo, teal, warm coral), premium editorial typography, business magazine quality, masterful art direction",
      cientifico: "academic scientific diagram, precise technical illustration, labeled molecular/anatomical illustrations, muted scholarly palette (navy, sage, ochre, ivory), Nature-magazine textbook quality",
      anime: "Japanese anime/manga educational poster, vibrant cel-shaded illustrations, expressive characters, dynamic composition, bold colors",
      esboco: "hand-drawn pencil sketch infographic, doodle bullet journal aesthetic, monochromatic with watercolor accents, handwritten labels, paper texture",
      minimalista: "minimalist line-art infographic, ultra clean, lots of whitespace, single accent color, geometric shapes, Swiss design, sophisticated and calm",
    };
    const styleDesc = styleSheet[estilo] ?? styleSheet.profissional;

    const sectionsText = (brief.secoes ?? []).map((s: any, i: number) =>
      `${i + 1}. "${s.rotulo}": ${(s.elementos ?? []).join(" / ")}`
    ).join("\n");

    const prompt = `Create a PROFESSIONAL educational infographic poster IN BRAZILIAN PORTUGUESE — premium editorial quality, museum-level art direction.

STYLE: ${styleDesc}

TITLE (large, top center): "${brief.titulo}"
SUBTITLE (below title): "${brief.subtitulo}"

LAYOUT: ${(brief.secoes?.length ?? 2) <= 2 ? "two side-by-side columns" : "grid of 3-4 quadrants with clear section boundaries and visual hierarchy"}

SECTIONS (each with header pill + bulleted facts):
${sectionsText}

VISUAL ELEMENTS: ${(brief.icones_chave ?? []).join(", ")}

REQUIREMENTS:
- All text MUST be in flawless Brazilian Portuguese, perfectly legible, zero spelling errors
- Use the title and section labels EXACTLY as written above
- Each section labeled with its rotulo as a colored badge or header pill
- Include rich illustrative icons or characters representing the topic
- Cohesive premium color palette throughout
- Consistent typography hierarchy (display, headings, body)
- Bottom right corner: small "StudyAI" watermark
- Print-quality composition, high visual sophistication
- DO NOT include lorem ipsum or filler text — use the EXACT facts provided`;

    const sizeMap: Record<string, "1024x1024" | "1536x1024" | "1024x1536"> = {
      quadrado: "1024x1024", paisagem: "1536x1024", retrato: "1024x1536",
    };
    const size = sizeMap[orientacao] ?? "1024x1536";
    const buffer = await generateImageBuffer(prompt, size, "high");

    const b64 = buffer.toString("base64");

    if (req.userId) {
      saveGeneratedContent({
        ownerId: req.userId, ownerRole: "student",
        kind: "infografico",
        title: brief.titulo || topico,
        materia,
        // Salva imagem como data URL pra reabrir depois (PNGs típicos: 200kb-1.5mb)
        payload: {
          b64_json: b64,
          mimeType: "image/png",
          titulo: brief.titulo,
          subtitulo: brief.subtitulo,
          estilo, orientacao,
          brief,
        },
      }).catch(() => {});
    }

    const infoPayload = { b64_json: b64, mimeType: "image/png", titulo: brief.titulo, subtitulo: brief.subtitulo, estilo, orientacao };
    cacheSave("infografico", ckInfo, JSON.stringify(infoPayload), OR.claude).catch(() => {});
    res.json(infoPayload);
  } catch (e: any) {
    console.error("studio-ia infografico:", e);
    res.status(500).json({ erro: e.message ?? "Erro ao gerar infográfico" });
  }
});

// ─── POST /api/studio-ia/slides ──────────────────────────────────────────────
router.post("/studio-ia/slides", async (req: Request, res: Response) => {
  if (!ensureAuth(req, res)) return;
  const { topico, materia = "Geral", nivel = "ENEM", comImagens = false } = req.body as {
    topico: string; materia?: string; nivel?: string; comImagens?: boolean;
  };
  if (!topico?.trim()) { res.status(400).json({ erro: "Tópico obrigatório" }); return; }

  // ── Cache semântico — slides sem imagens podem ser reutilizados ──────────
  if (!comImagens) {
    const ckSlides = `slides|${materia}|${topico}|${nivel}`;
    const cachedSlides = await cacheGet("slides", ckSlides);
    if (cachedSlides.hit) {
      try { res.json(JSON.parse(cachedSlides.response)); return; } catch { /* gera novo */ }
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // 🎓 PROMPT PROFISSIONAL — exige qualidade impecável, didática real,
  // estrutura narrativa, exemplos brasileiros, alinhamento BNCC/ENEM.
  // ──────────────────────────────────────────────────────────────────────────
  const systemPrompt = `Você é o autor sênior de uma editora educacional brasileira premium (à altura de Saraiva, Moderna, Bernoulli) — especialista em ${nivel} e na BNCC.

Sua missão: criar uma APRESENTAÇÃO IMPECÁVEL sobre "${topico}" (matéria: ${materia}) — qualidade profissional, conteúdo denso porém claro, estrutura narrativa que prende a atenção e leva o aluno a DOMINAR o tema.

📐 ESTRUTURA OBRIGATÓRIA (8 a 12 slides):
  1. CAPA (tipo "titulo") — título magnético + subtítulo curricular
  2. AGENDA / ROTEIRO (tipo "conteudo") — o que será visto, em 3-5 bullets
  3-N. DESENVOLVIMENTO conceitual progressivo:
       • "conteudo": lista de pontos-chave (3-6 itens)
       • "exemplo": exemplo concreto e brasileiro do cotidiano/atualidade
       • "destaque": ponto de prova / pegadinha clássica do ENEM/vestibular
       • "lista": enumeração taxonômica (causas, etapas, classificações)
  N+1. QUIZ (tipo "quiz") — pergunta de fixação no padrão da banca
  ÚLTIMO. CONCLUSÃO (tipo "conclusao") — síntese + próximos passos

🎨 IDENTIDADE VISUAL:
  - Escolha "tema" coerente com o tema: indigo (humanas/exatas), rose (literatura/artes), emerald (biológicas/natureza), amber (história/geografia)
  - Cada slide tem um emoji que representa o conteúdo (não o tipo)
  - Cada slide tem "imageBrief" em INGLÊS (1-2 frases) descrevendo cena visual cinematográfica, fotorrealista ou ilustração editorial — pensando em estética de revista premium

✍️ QUALIDADE EDITORIAL:
  - Títulos curtos e fortes (max 8 palavras), sem clichês
  - Bullets paralelos sintaticamente, com substantivos no início
  - Linguagem precisa: zero "etc.", zero "entre outros", zero generalidades vagas
  - Cite leis, datas, autores, fórmulas EXATAS quando relevante (sem inventar)
  - Exemplos sempre brasileiros (Brasília, Amazônia, Salvador, samba, futebol, jurisprudência STF, Lei Maria da Penha, Plano Real, etc.)
  - Conexões interdisciplinares quando naturais (marca do ENEM)
  - Para quiz: pergunta no estilo da banca + alternativa correta clara

📤 FORMATO DE SAÍDA — RETORNE EXCLUSIVAMENTE JSON VÁLIDO, sem markdown, sem prosa antes/depois:
{
  "titulo": "Título magnético da apresentação",
  "subtitulo": "Matéria | ${nivel}",
  "tema": "indigo" | "rose" | "emerald" | "amber",
  "slides": [
    { "n": 1, "tipo": "titulo", "titulo": "...", "subtitulo": "...", "emoji": "🧬", "imageBrief": "cinematic editorial photograph of ..." },
    { "n": 2, "tipo": "conteudo", "titulo": "Roteiro da aula", "items": ["...", "..."], "emoji": "📋", "imageBrief": "..." },
    { "n": 3, "tipo": "exemplo", "titulo": "...", "texto": "parágrafo claro com exemplo brasileiro", "emoji": "💡", "imageBrief": "..." },
    { "n": 4, "tipo": "destaque", "titulo": "Cai no ENEM", "texto": "...", "emoji": "⭐", "imageBrief": "..." },
    { "n": 5, "tipo": "quiz", "titulo": "Teste-se", "pergunta": "...", "emoji": "❓", "imageBrief": "..." },
    { "n": 6, "tipo": "conclusao", "titulo": "...", "texto": "síntese + próximos passos", "emoji": "🎯", "imageBrief": "..." }
  ]
}

Tipos válidos: titulo, conteudo, lista, exemplo, destaque, quiz, conclusao.
GERE AGORA o JSON completo e impecável.`;

  const userPrompt = `Tópico: "${topico}"
Matéria: ${materia}
Nível: ${nivel}

Crie a apresentação completa, no padrão editorial premium, retornando APENAS o JSON.`;

  // ──────────────────────────────────────────────────────────────────────────
  // Geração: Claude Sonnet via OpenRouter (generateWithGemini) → OR.pro (fallback)
  // ──────────────────────────────────────────────────────────────────────────
  let raw = "";
  let modelUsed = "anthropic/claude-3.5-sonnet";
  try {
    raw = await generateWithGemini(systemPrompt, userPrompt, 8000);
    if (!raw || raw.length < 100) throw new Error("Claude retornou conteúdo vazio");
  } catch (gemErr) {
    console.warn("[studio-ia/slides] Claude falhou, usando OR.pro:", (gemErr as Error)?.message);
    try {
      const completion = await gpt.chat.completions.create({
        model: OR.pro,
        temperature: 0.6,
        max_tokens: 4000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      });
      raw = completion.choices[0].message.content ?? "{}";
      modelUsed = OR.pro;
    } catch (gptErr) {
      console.error("[studio-ia/slides] todos os modelos falharam:", gptErr);
      res.status(500).json({ erro: "Erro ao gerar slides" });
      return;
    }
  }

  let parsed: any;
  try {
    parsed = JSON.parse(extractJson(raw));
  } catch (parseErr) {
    console.error("studio-ia slides — JSON inválido:", parseErr, raw.slice(0, 500));
    res.status(500).json({ erro: "Resposta da IA em formato inválido" });
    return;
  }
  parsed.slides = parsed.slides ?? [];
  parsed._model = modelUsed;
  if (!comImagens) {
    const ckSlidesSave = `slides|${materia}|${topico}|${nivel}`;
    cacheSave("slides", ckSlidesSave, JSON.stringify(parsed), modelUsed).catch(() => {});
  }

  // ────────────────────────────────────────────────────────────────────────
  // 🖼️ Imagens premium (gpt-image-1, quality:"high") — 6 primeiros slides
  // ────────────────────────────────────────────────────────────────────────
  if (comImagens) {
    const slidesToImage = parsed.slides.slice(0, 6);
    const imgPromises = slidesToImage.map(async (s: any, idx: number) => {
      if (!s.imageBrief) return null;
      const styleHint = idx === 0
        ? "premium editorial cover illustration, cinematic lighting, vibrant gradient background, magazine-quality composition, sophisticated color palette, high visual impact"
        : "premium editorial illustration, clean modern composition, brand-consistent palette, refined typography-free design, professional educational aesthetic";
      const fullPrompt = `${s.imageBrief}. ${styleHint}. NO TEXT, NO WORDS, NO LABELS, NO LETTERS in the image. Pure visual storytelling.`;
      try {
        const buf = await generateImageBuffer(
          fullPrompt,
          idx === 0 ? "1536x1024" : "1024x1024",
          "high",
        );
        return { n: s.n, b64_json: buf.toString("base64") };
      } catch (e) {
        console.warn(`[studio-ia/slides] imagem slide ${s.n} falhou:`, (e as Error)?.message);
        return null;
      }
    });
    const imgs = await Promise.all(imgPromises);
    const imgMap = new Map(imgs.filter(Boolean).map(x => [x!.n, x!.b64_json]));
    parsed.slides = parsed.slides.map((s: any) => ({
      ...s,
      ...(imgMap.has(s.n) ? { image_b64: imgMap.get(s.n) } : {}),
    }));
  }

  if (req.userId) {
    saveGeneratedContent({
      ownerId: req.userId, ownerRole: "student",
      kind: "slides",
      title: parsed?.titulo || topico,
      materia,
      payload: parsed,
    }).catch(() => {});
  }

  res.json(parsed);
});

export default router;
