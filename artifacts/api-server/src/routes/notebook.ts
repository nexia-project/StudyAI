/**
 * /api/notebook — StudyAI Notebook (RAG sem embeddings: busca textual robusta)
 *
 * Usa Replit AI Integrations proxy (GPT-4o-mini) para toda geração de texto.
 * RAG implementado com busca por palavras-chave + full-text search no Postgres.
 * Sem dependência de OPENAI_API_KEY ou DEEPSEEK_API_KEY.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import { createRequire } from "module";
import OpenAI from "openai";
import multer from "multer";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { validateFileUpload } from "../middlewares/security";

const _require = createRequire(import.meta.url);
const router: IRouter = Router();

// ─── AI client via Replit AI Integrations proxy ────────────────────────────
const gpt = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY ?? "dummy",
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Text extraction ──────────────────────────────────────────────────────────
async function extractText(file: Express.Multer.File): Promise<string> {
  const mime = file.mimetype;

  if (mime === "text/plain") return file.buffer.toString("utf8").slice(0, 200_000);

  if (mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const mammoth = await import("mammoth");
    const r = await mammoth.extractRawText({ buffer: file.buffer });
    return r.value.slice(0, 200_000);
  }

  if (mime === "application/pdf") {
    try {
      const pdfParser = _require("pdf-parse/lib/pdf-parse");
      const parsed = await pdfParser(file.buffer);
      return parsed.text.slice(0, 200_000);
    } catch {
      return file.buffer.toString("latin1")
        .replace(/[^\x20-\x7E\n\r\t\xA0-\xFF]/g, " ")
        .replace(/\s{3,}/g, "\n").trim().slice(0, 200_000);
    }
  }

  return "";
}

// ─── Chunk text ───────────────────────────────────────────────────────────────
function chunkText(text: string, size = 800, overlap = 120): string[] {
  const chunks: string[] = [];
  let start = 0;
  while (start < text.length) {
    const end = Math.min(start + size, text.length);
    const chunk = text.slice(start, end).trim();
    if (chunk.length > 60) chunks.push(chunk);
    start += size - overlap;
  }
  return chunks;
}

// ─── Save doc + text chunks to DB (sem embeddings) ───────────────────────────
async function saveDocWithChunks(
  userId: string,
  title: string,
  contentText: string,
  sourceType: "pdf" | "text" | "url",
  sourceRef?: string,
  fileSizeKb?: number,
): Promise<number> {
  // 1. Save main doc
  const result = await db.execute(sql`
    INSERT INTO knowledge_documents (title, content_text, uploaded_by, source_file, file_size_kb, language)
    VALUES (${title}, ${contentText.slice(0, 100_000)}, ${userId}, ${sourceRef ?? null}, ${fileSizeKb ?? null}, 'pt')
    RETURNING id
  `);
  const docId = (result.rows[0] as any).id as number;

  // 2. Save chunks without embeddings (using notebook_embeddings table for compatibility)
  const chunks = chunkText(contentText);
  for (let i = 0; i < chunks.length; i++) {
    await db.execute(sql`
      INSERT INTO notebook_embeddings (user_id, doc_id, chunk_text, chunk_index, source_title)
      VALUES (${userId}, ${docId}, ${chunks[i]}, ${i}, ${title})
    `);
  }

  return docId;
}

// ─── RAG: keyword-based search ────────────────────────────────────────────────
async function ragSearch(
  userId: string,
  docIds: number[] | null,
  query: string,
  topK = 8,
): Promise<Array<{ text: string; title: string }>> {
  // Extract meaningful keywords
  const stopWords = new Set(["o","a","os","as","um","uma","de","da","do","e","que","em","para","com","por","se","me","te","nos","isso","isto","esse","esta","este","como","qual","quais","quando","onde","quem","não","sim","mais","mas","ou","é","foi","ser","ter","há","já","este","nesta","nesse","qual","seu","sua"]);
  const keywords = query
    .toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopWords.has(w))
    .slice(0, 5);

  const docFilter = docIds && docIds.length > 0 ? `AND doc_id = ANY(ARRAY[${docIds.join(",")}]::int[])` : "";

  let queryStr: string;
  if (keywords.length === 0) {
    // No keywords — return first topK chunks
    queryStr = `
      SELECT chunk_text, source_title FROM notebook_embeddings
      WHERE user_id = $1 ${docFilter}
      ORDER BY chunk_index ASC LIMIT ${topK}
    `;
  } else {
    // Build ILIKE conditions for each keyword
    const ilikeConditions = keywords.map(kw => `chunk_text ILIKE '%${kw.replace(/'/g, "''")}%'`).join(" OR ");
    const scoreExpr = keywords.map(kw => `(CASE WHEN chunk_text ILIKE '%${kw.replace(/'/g, "''")}%' THEN 1 ELSE 0 END)`).join(" + ");
    queryStr = `
      SELECT chunk_text, source_title, (${scoreExpr}) as score
      FROM notebook_embeddings
      WHERE user_id = $1 ${docFilter} AND (${ilikeConditions})
      ORDER BY score DESC, chunk_index ASC LIMIT ${topK * 2}
    `;
  }

  const rows = await db.execute(sql.raw(queryStr.replace("$1", `'${userId.replace(/'/g, "''")}'`)));
  const results = rows.rows as any[];

  // Deduplicate
  const seen = new Set<string>();
  return results
    .filter(r => {
      const key = String(r.chunk_text).slice(0, 100);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, topK)
    .map(r => ({ text: String(r.chunk_text), title: String(r.source_title ?? "Documento") }));
}

// ─── POST /api/notebook/upload-file ──────────────────────────────────────────
router.post("/notebook/upload-file", upload.single("file"), validateFileUpload, async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  if (!req.file) { res.status(400).json({ erro: "Arquivo obrigatório" }); return; }

  const title = (req.body.title as string) || req.file.originalname.replace(/\.[^.]+$/, "");
  try {
    const text = await extractText(req.file);
    if (!text || text.length < 20) {
      res.status(400).json({ erro: "Não foi possível extrair texto do arquivo. Use um PDF com texto selecionável (não escaneado)." });
      return;
    }
    const chunks = chunkText(text);
    const docId = await saveDocWithChunks(
      req.userId, title, text, "pdf",
      req.file.originalname, Math.round(req.file.size / 1024),
    );
    res.json({ id: docId, title, chars: text.length, chunks: chunks.length, message: `✅ "${title}" adicionado — ${chunks.length} trechos indexados` });
  } catch (e) {
    console.error("notebook upload-file:", e);
    res.status(500).json({ erro: "Erro ao processar arquivo. Tente novamente." });
  }
});

// ─── POST /api/notebook/upload-text ──────────────────────────────────────────
router.post("/notebook/upload-text", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { title, content } = req.body as { title: string; content: string };
  if (!title || !content) { res.status(400).json({ erro: "Título e conteúdo obrigatórios" }); return; }

  try {
    const chunks = chunkText(content);
    const docId = await saveDocWithChunks(req.userId, title, content, "text");
    res.json({ id: docId, title, chars: content.length, chunks: chunks.length, message: `✅ "${title}" adicionado` });
  } catch (e) {
    console.error("notebook upload-text:", e);
    res.status(500).json({ erro: "Erro ao processar texto" });
  }
});

// ─── POST /api/notebook/upload-url ───────────────────────────────────────────
router.post("/notebook/upload-url", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { url, title } = req.body as { url: string; title?: string };
  if (!url) { res.status(400).json({ erro: "URL obrigatória" }); return; }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    const r = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; StudyAI/1.0)" },
    });
    clearTimeout(timeout);
    if (!r.ok) {
      res.status(422).json({ erro: `Não foi possível acessar a URL (código ${r.status})` });
      return;
    }
    const html = await r.text();
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 150_000);

    if (text.length < 100) {
      res.status(400).json({ erro: "Não foi possível extrair conteúdo desta URL" });
      return;
    }

    const docTitle = title || new URL(url).hostname;
    const chunks = chunkText(text);
    const docId = await saveDocWithChunks(req.userId, docTitle, text, "url", url);
    res.json({ id: docId, title: docTitle, chars: text.length, chunks: chunks.length, message: `✅ "${docTitle}" importado` });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("notebook upload-url:", msg);
    if (msg.includes("abort")) { res.status(422).json({ erro: "URL demorou muito para responder (timeout de 15s)" }); }
    else { res.status(500).json({ erro: `Não foi possível acessar a URL: ${msg}` }); }
  }
});

// ─── GET /api/notebook/docs ───────────────────────────────────────────────────
router.get("/notebook/docs", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  try {
    const docs = await db.execute(sql`
      SELECT id, title, source_file, file_size_kb,
             created_at, LENGTH(content_text) as content_length
      FROM knowledge_documents
      WHERE uploaded_by = ${req.userId}
        AND (is_chunk IS NULL OR is_chunk = false)
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json([...docs.rows]);
  } catch (e) {
    res.status(500).json({ erro: "Erro ao buscar documentos" });
  }
});

// ─── DELETE /api/notebook/docs/:id ───────────────────────────────────────────
router.delete("/notebook/docs/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const docId = parseInt(req.params.id);
  if (isNaN(docId)) { res.status(400).json({ erro: "ID inválido" }); return; }
  try {
    await db.execute(sql`DELETE FROM notebook_embeddings WHERE doc_id = ${docId} AND user_id = ${req.userId}`);
    await db.execute(sql`DELETE FROM knowledge_documents WHERE id = ${docId} AND uploaded_by = ${req.userId}`);
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ erro: "Erro ao deletar documento" });
  }
});

// ─── POST /api/notebook/chat ──────────────────────────────────────────────────
router.post("/notebook/chat", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { pergunta, docIds } = req.body as { pergunta: string; docIds?: number[] };
  if (!pergunta?.trim()) { res.status(400).json({ erro: "Pergunta obrigatória" }); return; }

  try {
    const chunks = await ragSearch(req.userId, docIds?.length ? docIds : null, pergunta, 8);

    if (!chunks.length) {
      res.json({
        resposta: "Não encontrei documentos para responder. Adicione pelo menos um documento primeiro usando os botões de PDF, Texto ou URL.",
        fontes: [],
      });
      return;
    }

    const context = chunks
      .map((c, i) => `[Fonte ${i + 1} — "${c.title}"]\n${c.text}`)
      .join("\n\n---\n\n");

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 1500,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão, assistente de estudos especialista em preparação para ENEM e vestibulares brasileiros.
Responda em português brasileiro, de forma clara, didática e objetiva.
Use EXCLUSIVAMENTE as fontes abaixo para responder. Não invente informações.
Cite as fontes usando [Fonte N] quando usar uma informação específica.
Se a pergunta não puder ser respondida com base nas fontes, diga isso claramente.
Ao final, se relevante, acrescente uma dica específica sobre como esse tema cai no ENEM.

FONTES DISPONÍVEIS:
${context}`,
        },
        { role: "user", content: pergunta },
      ],
    });

    const resposta = completion.choices[0].message.content ?? "";

    // Build unique sources cited — keep FULL trecho for clickable citations
    const fontesCitadas = new Map<number, { numero: number; titulo: string; trecho: string; trechoCompleto: string }>();
    const fonteRegex = /\[Fonte (\d+)\]/g;
    let match;
    while ((match = fonteRegex.exec(resposta)) !== null) {
      const n = parseInt(match[1]);
      if (chunks[n - 1] && !fontesCitadas.has(n)) {
        const full = chunks[n - 1].text;
        fontesCitadas.set(n, {
          numero: n,
          titulo: chunks[n - 1].title,
          trecho: full.slice(0, 200) + (full.length > 200 ? "…" : ""),
          trechoCompleto: full,
        });
      }
    }

    // If no citations detected, show all sources used
    const fontes = fontesCitadas.size > 0
      ? Array.from(fontesCitadas.values())
      : chunks.slice(0, 3).map((c, i) => ({
          numero: i + 1,
          titulo: c.title,
          trecho: c.text.slice(0, 200) + (c.text.length > 200 ? "…" : ""),
          trechoCompleto: c.text,
        }));

    res.json({ resposta, fontes });
  } catch (e) {
    console.error("notebook chat:", e);
    res.status(500).json({ erro: "Erro ao processar pergunta. Verifique sua conexão e tente novamente." });
  }
});

// ─── POST /api/notebook/overview ─────────────────────────────────────────────
router.post("/notebook/overview", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    // Cache check
    const cached = await db.execute(sql`
      SELECT summary, key_topics, faq FROM notebook_overviews
      WHERE user_id = ${req.userId} AND doc_id = ${docId}
      LIMIT 1
    `);
    const cachedRow = (cached.rows as any[])[0];
    if (cachedRow?.summary) {
      res.json({
        summary: cachedRow.summary,
        keyTopics: typeof cachedRow.key_topics === "string" ? JSON.parse(cachedRow.key_topics) : cachedRow.key_topics,
        faq: typeof cachedRow.faq === "string" ? JSON.parse(cachedRow.faq) : cachedRow.faq,
      });
      return;
    }

    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId}
      LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `Analise o documento e retorne APENAS um JSON válido, sem markdown:
{
  "summary": "Resumo em 3-5 frases claras e didáticas do que o documento trata",
  "keyTopics": ["tópico 1", "tópico 2", "tópico 3", "tópico 4", "tópico 5", "tópico 6"],
  "faq": [
    { "q": "Pergunta sobre o conteúdo?", "a": "Resposta concisa e direta" }
  ]
}
Gere 5-6 tópicos-chave e 5 perguntas frequentes relevantes para estudo.
Foco em preparação para ENEM/vestibular.`,
        },
        { role: "user", content: `Título: "${row.title}"\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);

    // Cache
    try {
      await db.execute(sql`
        INSERT INTO notebook_overviews (user_id, doc_id, summary, key_topics, faq)
        VALUES (${req.userId}, ${docId}, ${parsed.summary}, ${JSON.stringify(parsed.keyTopics)}, ${JSON.stringify(parsed.faq)})
        ON CONFLICT DO NOTHING
      `);
    } catch { /* cache non-critical */ }

    res.json({ summary: parsed.summary, keyTopics: parsed.keyTopics, faq: parsed.faq });
  } catch (e) {
    console.error("notebook overview:", e);
    res.status(500).json({ erro: "Erro ao gerar visão geral" });
  }
});

// ─── POST /api/notebook/study-guide ──────────────────────────────────────────
router.post("/notebook/study-guide", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Você é professor especialista em ENEM e vestibulares. Crie um guia de estudo completo.
Retorne APENAS JSON válido, sem markdown:
{
  "titulo": "Guia de Estudo: [assunto]",
  "introducao": "Frase motivacional sobre o tema",
  "questoes": [
    {
      "tipo": "conceito|aplicacao|comparacao|analise",
      "pergunta": "Pergunta de estudo profunda?",
      "resposta": "Resposta detalhada com exemplos do mundo real",
      "dicaEnem": "Como e com que frequência esse tema cai no ENEM"
    }
  ],
  "cronogramaSugerido": ["Dia 1: ...", "Dia 2: ...", "Dia 3: ..."]
}
Gere 8-10 questões variadas cobrindo todo o documento.`,
        },
        { role: "user", content: `Tema: "${row.title}"\n\nConteúdo:\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook study-guide:", e);
    res.status(500).json({ erro: "Erro ao gerar guia de estudo" });
  }
});

// ─── POST /api/notebook/flashcards ───────────────────────────────────────────
router.post("/notebook/flashcards", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, quantidade = 15 } = req.body as { docId: number; quantidade?: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.5,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Crie ${quantidade} flashcards de estudo de alta qualidade. Retorne APENAS JSON:
{"flashcards": [
  {"frente": "Pergunta clara e específica", "verso": "Resposta completa com contexto e exemplos", "materia": "área do conhecimento", "dificuldade": "facil|medio|dificil"}
]}
Varie a dificuldade (40% fácil, 40% médio, 20% difícil). Priorize o que cai no ENEM.`,
        },
        { role: "user", content: `Tema: "${row.title}"\n\n${row.content_text.slice(0, 12_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook flashcards:", e);
    res.status(500).json({ erro: "Erro ao gerar flashcards" });
  }
});

// ─── POST /api/notebook/questoes ─────────────────────────────────────────────
router.post("/notebook/questoes", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, quantidade = 5 } = req.body as { docId: number; quantidade?: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.6,
      max_tokens: 3500,
      messages: [
        {
          role: "system",
          content: `Crie ${quantidade} questões no estilo exato do ENEM (5 alternativas A-E, contextualização prévia, linguagem formal). Retorne APENAS JSON:
{"questoes": [
  {
    "enunciado": "Contexto + enunciado completo no estilo ENEM",
    "alternativas": {"A": "texto", "B": "texto", "C": "texto", "D": "texto", "E": "texto"},
    "gabarito": "A",
    "explicacao": "Explicação detalhada de por que a resposta é correta e por que as outras estão erradas"
  }
]}`,
        },
        { role: "user", content: `Tema: "${row.title}"\n\n${row.content_text.slice(0, 12_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook questoes:", e);
    res.status(500).json({ erro: "Erro ao gerar questões" });
  }
});

// ─── POST /api/notebook/mapa-mental ──────────────────────────────────────────
router.post("/notebook/mapa-mental", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.2,
      max_tokens: 2500,
      messages: [
        {
          role: "system",
          content: `Crie um mapa mental completo e detalhado. Retorne APENAS JSON válido:
{
  "subject": "Tema principal do documento",
  "color": "#6366f1",
  "topics": [
    {
      "name": "Tópico Principal",
      "color": "#ec4899",
      "subtopics": [
        { "name": "Subtópico específico", "detail": "detalhe ou definição curta" }
      ]
    }
  ]
}
Use estas cores: #6366f1 #ec4899 #f59e0b #10b981 #3b82f6 #8b5cf6 #06b6d4 #f97316
Gere 6-8 tópicos principais, cada um com 3-5 subtópicos.`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\n${row.content_text.slice(0, 14_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook mapa-mental:", e);
    res.status(500).json({ erro: "Erro ao gerar mapa mental" });
  }
});

// ─── POST /api/notebook/podcast ──────────────────────────────────────────────
// Feature exclusiva: Geração de roteiro de podcast educativo (como NotebookLM Audio Overview)
router.post("/notebook/podcast", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.7,
      max_tokens: 3500,
      messages: [
        {
          role: "system",
          content: `Você vai criar um roteiro de podcast educativo em português brasileiro, estilo conversa natural entre dois apresentadores:
- ANA: professora entusiasta, explica conceitos de forma clara e usa analogias
- MARCOS: estudante curioso do ENEM, faz perguntas inteligentes, às vezes surpreso com descobertas

Retorne APENAS JSON válido:
{
  "titulo": "Título do episódio (criativo e envolvente)",
  "subtitulo": "Matéria | Nível: ENEM/Vestibular",
  "duracao": "XX minutos (estimado)",
  "roteiro": [
    { "speaker": "ANA", "fala": "texto natural da fala" },
    { "speaker": "MARCOS", "fala": "texto natural da fala" }
  ],
  "destaques": ["ponto chave 1", "ponto chave 2", "ponto chave 3"]
}

O roteiro deve:
- Ter 12-18 falas alternando entre os dois
- Começar com uma introdução cativante que desperta curiosidade
- Cobrir os principais conceitos do documento de forma progressiva
- Incluir perguntas retóricas, exemplos cotidianos e conexões com o ENEM
- Terminar com um resumo dos pontos principais e dica de estudo
- Usar linguagem natural, não formal — como um podcast real`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\n${row.content_text.slice(0, 15_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook podcast:", e);
    res.status(500).json({ erro: "Erro ao gerar podcast" });
  }
});

// ─── POST /api/notebook/tiagao-explica ───────────────────────────────────────
router.post("/notebook/tiagao-explica", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão. Crie uma aula completa na lousa sobre o documento.
Retorne APENAS JSON válido:
{
  "titulo": "Título da aula",
  "subtitulo": "Foco ENEM",
  "etapas": [
    {
      "id": 1,
      "narracao": "4-6 frases didáticas, animadas e diretas em PT-BR",
      "elementos": [
        {"tipo": "titulo", "texto": "string", "cor": "#1e1b4b"},
        {"tipo": "texto", "texto": "explicação completa e clara"},
        {"tipo": "destaque", "texto": "conceito-chave importante", "cor": "#bbf7d0", "corTexto": "#166534"},
        {"tipo": "exemplo", "texto": "exemplo concreto do mundo real", "cor": "#dbeafe"},
        {"tipo": "seta", "texto": "→ ponto importante para lembrar", "cor": "#6366f1"}
      ],
      "duracao": 30
    }
  ]
}
Gere 4-5 etapas cobrindo todo o conteúdo de forma progressiva.`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\n${row.content_text.slice(0, 12_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const aula = JSON.parse(clean);

    res.json({ aula, titulo: row.title });
  } catch (e) {
    console.error("notebook tiagao-explica:", e);
    res.status(500).json({ erro: "Erro ao gerar aula" });
  }
});

// ─── POST /api/notebook/timeline ─────────────────────────────────────────────
router.post("/notebook/timeline", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.3,
      max_tokens: 2500,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão. Extraia uma LINHA DO TEMPO cronológica do documento.
Útil para História, Biologia (evolução), Química (descobertas), Literatura (escolas literárias), etc.
Se o documento não tiver natureza cronológica clara, infira marcos temáticos progressivos.
Retorne APENAS JSON válido:
{
  "titulo": "Título da linha do tempo",
  "tema": "tema principal",
  "eventos": [
    {
      "data": "1500" ou "Século XIX" ou "Etapa 1",
      "titulo": "Nome curto do evento",
      "descricao": "2-3 frases didáticas explicando o evento",
      "importancia": "alta" | "media" | "baixa",
      "categoria": "string curta (ex: Político, Cultural, Científico)",
      "dicaEnem": "frase curta sobre como cai no ENEM (opcional)"
    }
  ]
}
Gere 6-12 eventos em ordem cronológica.`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\n${row.content_text.slice(0, 12_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const timeline = JSON.parse(clean);

    res.json({ timeline });
  } catch (e) {
    console.error("notebook timeline:", e);
    res.status(500).json({ erro: "Erro ao gerar linha do tempo" });
  }
});

// ─── POST /api/notebook/slides ───────────────────────────────────────────────
router.post("/notebook/slides", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    const row = (docs.rows as any[])[0];
    if (!row) { res.status(404).json({ erro: "Documento não encontrado" }); return; }

    const completion = await gpt.chat.completions.create({
      model: "gpt-4o-mini",
      temperature: 0.4,
      max_tokens: 3500,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão criando uma APRESENTAÇÃO PROFISSIONAL em slides sobre o documento.
Pense como um designer de slides do NotebookLM: títulos curtos, hierarquia clara, bullets concisos.
Retorne APENAS JSON válido:
{
  "titulo": "Título da apresentação (≤ 8 palavras)",
  "subtitulo": "Subtítulo de uma linha",
  "autor": "Professor Tiagão",
  "tema": "indigo" | "rose" | "emerald" | "amber",
  "slides": [
    {
      "tipo": "capa",
      "titulo": "string",
      "subtitulo": "string",
      "icone": "BookOpen"
    },
    {
      "tipo": "agenda",
      "titulo": "Agenda",
      "itens": ["item 1", "item 2", "item 3"]
    },
    {
      "tipo": "conteudo",
      "titulo": "string (≤ 6 palavras)",
      "subtitulo": "string opcional",
      "bullets": ["frase curta e potente", "outra frase", "..."],
      "destaque": "frase de impacto opcional"
    },
    {
      "tipo": "comparacao",
      "titulo": "string",
      "esquerda": {"titulo": "string", "itens": ["..."]},
      "direita": {"titulo": "string", "itens": ["..."]}
    },
    {
      "tipo": "citacao",
      "texto": "citação direta do material",
      "autor": "string opcional"
    },
    {
      "tipo": "encerramento",
      "titulo": "Conclusão",
      "mensagem": "frase final de uma linha",
      "dicaEnem": "como esse tema cai no ENEM"
    }
  ]
}
Gere 8-12 slides total. Comece com "capa", inclua 1 "agenda", varie os tipos, termine com "encerramento".
Bullets devem ser FRASES CURTAS (máx 12 palavras), nunca parágrafos.`,
        },
        { role: "user", content: `Documento: "${row.title}"\n\n${row.content_text.slice(0, 12_000)}` },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const apresentacao = JSON.parse(clean);

    res.json({ apresentacao, titulo: row.title });
  } catch (e) {
    console.error("notebook slides:", e);
    res.status(500).json({ erro: "Erro ao gerar apresentação" });
  }
});

export default router;
