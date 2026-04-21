/**
 * /api/studio-ia — Geradores topic-based para Professor + Instituições
 *
 * Diferente de /api/notebook/* (que precisa de docId), aqui o input é
 * { topico, materia, nivel } e a IA gera tudo do zero.
 *   - POST /studio-ia/infografico   → b64 image
 *   - POST /studio-ia/mapa-mental   → 4-level mapa (subject → categories → topics → subtopics)
 *   - POST /studio-ia/slides        → slides + (opcional) imagens IA por slide
 */

import { Router, type IRouter, type Request, type Response } from "express";
import OpenAI from "openai";
import { generateImageBuffer } from "@workspace/integrations-openai-ai-server/image";

const router: IRouter = Router();

const gpt = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

function ensureAuth(req: Request, res: Response): boolean {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return false; }
  return true;
}

function jsonClean(raw: string): string {
  return raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
}

// ─── POST /api/studio-ia/mapa-mental ─────────────────────────────────────────
router.post("/studio-ia/mapa-mental", async (req: Request, res: Response) => {
  if (!ensureAuth(req, res)) return;
  const { topico, materia = "Geral", nivel = "ENEM" } = req.body as {
    topico: string; materia?: string; nivel?: string;
  };
  if (!topico?.trim()) { res.status(400).json({ erro: "Tópico obrigatório" }); return; }

  try {
    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Você cria mapas mentais HIERÁRQUICOS de 4 níveis sobre temas escolares brasileiros (${nivel}).
Retorne APENAS JSON válido:
{
  "subject": "Tema central (max 4 palavras)",
  "categories": [
    {
      "name": "Categoria nível 2 (max 4 palavras)",
      "topics": [
        {
          "name": "Tópico nível 3 (max 5 palavras)",
          "subtopics": [
            { "name": "Subtópico folha (max 6 palavras)", "detail": "1-2 frases factuais" }
          ]
        }
      ]
    }
  ]
}
Regras OBRIGATÓRIAS:
- 3 a 4 categorias principais
- 2 a 4 tópicos por categoria
- 3 a 5 subtópicos por tópico
- Conteúdo alinhado ao currículo brasileiro / BNCC
- Detail factual, sem inventar dados`,
        },
        { role: "user", content: `Matéria: ${materia}\nTema: ${topico}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(jsonClean(raw));
    if (parsed.topics && !parsed.categories) {
      parsed.categories = [{ name: parsed.subject, topics: parsed.topics }];
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

  try {
    const briefCompletion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `Você é diretor de arte criando briefing visual para um infográfico educacional sobre "${topico}" (${materia}, nível ${nivel}).
Retorne APENAS JSON:
{
  "titulo": "Título principal (max 8 palavras)",
  "subtitulo": "Subtítulo (max 15 palavras)",
  "secoes": [
    { "rotulo": "Nome (max 4 palavras)", "elementos": ["fato 1 curto", "fato 2", "fato 3"] }
  ],
  "icones_chave": ["substantivo concreto 1", "substantivo concreto 2", "substantivo concreto 3"]
}
- 3 a 4 seções
- 3 a 5 elementos por seção, MUITO concisos
- Conteúdo factual e curricular`,
        },
        { role: "user", content: `Crie um infográfico sobre "${topico}" da matéria ${materia}.` },
      ],
    });
    const brief = JSON.parse(jsonClean(briefCompletion.choices[0].message.content ?? "{}"));

    const styleSheet: Record<string, string> = {
      kawaii: "ultra cute kawaii illustration style, pastel colors, soft rounded shapes, smiling characters, hand-drawn outlines, sparkles, friendly playful mood",
      profissional: "modern flat infographic design, clean vector illustration, balanced composition, corporate palette (deep blue, teal, warm orange), clear typography, business magazine quality",
      cientifico: "academic scientific diagram, precise technical illustration, labeled molecular/anatomical illustrations, muted scholarly palette (navy, sage, ochre, ivory), textbook quality",
      anime: "Japanese anime/manga educational poster, vibrant cel-shaded illustrations, expressive characters, dynamic composition, bold colors",
      esboco: "hand-drawn pencil sketch infographic, doodle bullet journal aesthetic, monochromatic with watercolor accents, handwritten labels, paper texture",
      minimalista: "minimalist line-art infographic, ultra clean, lots of whitespace, single accent color, geometric shapes, Swiss design, sophisticated and calm",
    };
    const styleDesc = styleSheet[estilo] ?? styleSheet.profissional;

    const sectionsText = (brief.secoes ?? []).map((s: any, i: number) =>
      `${i + 1}. "${s.rotulo}": ${(s.elementos ?? []).join(" / ")}`
    ).join("\n");

    const prompt = `Create a professional educational infographic poster IN BRAZILIAN PORTUGUESE.

STYLE: ${styleDesc}

TITLE (large, top center): "${brief.titulo}"
SUBTITLE (below title): "${brief.subtitulo}"

LAYOUT: ${(brief.secoes?.length ?? 2) <= 2 ? "two side-by-side columns" : "grid of 3-4 quadrants with clear section boundaries"}

SECTIONS (each with header pill + bulleted facts):
${sectionsText}

VISUAL ELEMENTS: ${(brief.icones_chave ?? []).join(", ")}

REQUIREMENTS:
- All text MUST be in Brazilian Portuguese, clearly legible, no spelling errors
- Use the title exactly as written
- Each section labeled with its rotulo as a colored badge
- Include illustrative icons or characters representing the topic
- Cohesive color palette throughout
- Bottom right corner: small "StudyAI" watermark
- DO NOT include lorem ipsum or filler text — use the exact facts provided`;

    const sizeMap: Record<string, "1024x1024" | "1536x1024" | "1024x1536"> = {
      quadrado: "1024x1024", paisagem: "1536x1024", retrato: "1024x1536",
    };
    const size = sizeMap[orientacao] ?? "1024x1536";
    const buffer = await generateImageBuffer(prompt, size);

    res.json({
      b64_json: buffer.toString("base64"),
      mimeType: "image/png",
      titulo: brief.titulo,
      subtitulo: brief.subtitulo,
      estilo, orientacao,
    });
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

  try {
    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Você cria apresentações educacionais profissionais em português brasileiro para o ${nivel}.
Retorne APENAS JSON:
{
  "titulo": "Título da apresentação",
  "subtitulo": "Matéria | Nível",
  "tema": "indigo" | "rose" | "emerald" | "amber",
  "slides": [
    { "n": 1, "tipo": "titulo", "titulo": "...", "subtitulo": "...", "emoji": "🧬", "imageBrief": "descrição visual em inglês para gerar imagem (1 frase)" },
    { "n": 2, "tipo": "conteudo", "titulo": "...", "items": ["item 1","item 2"], "emoji": "📚", "imageBrief": "..." },
    { "n": 3, "tipo": "exemplo", "titulo": "...", "texto": "parágrafo", "emoji": "💡", "imageBrief": "..." },
    { "n": 4, "tipo": "destaque", "titulo": "...", "texto": "parágrafo", "emoji": "⭐", "imageBrief": "..." },
    { "n": 5, "tipo": "quiz", "titulo": "...", "pergunta": "...", "emoji": "❓", "imageBrief": "..." }
  ]
}
- 8 a 12 slides
- Tipos válidos: titulo (capa), conteudo (lista), lista, exemplo, destaque, quiz, conclusao
- Cada slide tem emoji apropriado e imageBrief em INGLÊS curto descrevendo a cena visual
- Conteúdo curricular brasileiro, exemplos do cotidiano nacional`,
        },
        { role: "user", content: `Crie uma apresentação sobre "${topico}" da matéria ${materia}.` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(jsonClean(raw));
    parsed.slides = parsed.slides ?? [];

    // Generate images in parallel (max first 6 slides) if requested
    if (comImagens) {
      const slidesToImage = parsed.slides.slice(0, 6);
      const imgPromises = slidesToImage.map(async (s: any, idx: number) => {
        if (!s.imageBrief) return null;
        const styleHint = idx === 0
          ? "modern editorial cover illustration, vibrant gradient background, bold typography style"
          : "clean educational vector illustration, flat design, friendly and modern, brand-consistent palette";
        const fullPrompt = `${s.imageBrief}. ${styleHint}. No text, no words, no labels in the image.`;
        try {
          const buf = await generateImageBuffer(fullPrompt, idx === 0 ? "1536x1024" : "1024x1024");
          return { n: s.n, b64_json: buf.toString("base64") };
        } catch { return null; }
      });
      const imgs = await Promise.all(imgPromises);
      const imgMap = new Map(imgs.filter(Boolean).map(x => [x!.n, x!.b64_json]));
      parsed.slides = parsed.slides.map((s: any) => ({
        ...s,
        ...(imgMap.has(s.n) ? { image_b64: imgMap.get(s.n) } : {}),
      }));
    }

    res.json(parsed);
  } catch (e) {
    console.error("studio-ia slides:", e);
    res.status(500).json({ erro: "Erro ao gerar slides" });
  }
});

export default router;
