/**
 * /api/notebook — StudyAI Notebook (RAG completo)
 *
 * Funcionalidades:
 * - Upload de PDF / texto / URL com geração automática de embeddings
 * - Chat RAG: cosine similarity → top-k chunks → GPT-4o grounded
 * - Auto-overview: resumo + tópicos-chave + FAQ ao adicionar fonte
 * - Guia de Estudo: pares Q&A do documento
 * - Geração de flashcards a partir do documento
 * - Geração de questões ENEM-style a partir do documento
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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 50 * 1024 * 1024 } });

// ─── Cosine similarity ────────────────────────────────────────────────────────
function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  return dot / (Math.sqrt(magA) * Math.sqrt(magB) + 1e-10);
}

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

// ─── Get embeddings (batch) ───────────────────────────────────────────────────
async function embedChunks(chunks: string[]): Promise<number[][]> {
  if (chunks.length === 0) return [];
  const response = await openai.embeddings.create({
    model: "text-embedding-3-small",
    input: chunks.map(c => c.slice(0, 8000)), // max tokens per chunk
  });
  return response.data.map(d => d.embedding);
}

// ─── Save doc + embeddings to DB ─────────────────────────────────────────────
async function saveDocWithEmbeddings(
  userId: string,
  title: string,
  contentText: string,
  sourceType: "pdf" | "text" | "url",
  sourceRef?: string,
  fileSizeKb?: number,
): Promise<number> {
  // 1. Save main doc
  const [doc] = await db.execute<{ id: number }>(sql`
    INSERT INTO knowledge_documents (title, content_text, uploaded_by, source_file, file_size_kb, language)
    VALUES (${title}, ${contentText.slice(0, 100_000)}, ${userId}, ${sourceRef ?? null}, ${fileSizeKb ?? null}, 'pt')
    RETURNING id
  `);
  const docId = doc.id;

  // 2. Chunk + embed in background
  const chunks = chunkText(contentText);
  const batchSize = 20;
  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);
    const embeddings = await embedChunks(batch);
    for (let j = 0; j < batch.length; j++) {
      await db.execute(sql`
        INSERT INTO notebook_embeddings (user_id, doc_id, chunk_text, chunk_index, embedding, source_title)
        VALUES (${userId}, ${docId}, ${batch[j]}, ${i + j}, ${JSON.stringify(embeddings[j])}, ${title})
      `);
    }
  }

  return docId;
}

// ─── RAG: find top-k relevant chunks ─────────────────────────────────────────
async function ragSearch(
  userId: string,
  docIds: number[] | null,
  query: string,
  topK = 6,
): Promise<Array<{ text: string; title: string; similarity: number }>> {
  const [queryEmb] = await embedChunks([query]);

  // Get all embeddings for user (or specific docs)
  const rows = await db.execute<{
    chunk_text: string;
    source_title: string;
    embedding: string;
  }>(sql`
    SELECT chunk_text, source_title, embedding
    FROM notebook_embeddings
    WHERE user_id = ${userId}
    ${docIds ? sql`AND doc_id = ANY(${docIds})` : sql``}
    AND embedding IS NOT NULL
    LIMIT 2000
  `);

  if (!rows.length) return [];

  const scored = rows
    .map(r => {
      const emb = typeof r.embedding === "string" ? JSON.parse(r.embedding) : r.embedding;
      return {
        text: r.chunk_text,
        title: r.source_title ?? "Documento",
        similarity: cosineSimilarity(queryEmb, emb as number[]),
      };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);

  return scored;
}

// ─── POST /api/notebook/upload-file ──────────────────────────────────────────
router.post("/notebook/upload-file", upload.single("file"), validateFileUpload, async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  if (!req.file) { res.status(400).json({ erro: "Arquivo obrigatório" }); return; }

  const title = (req.body.title as string) || req.file.originalname.replace(/\.[^.]+$/, "");
  try {
    const text = await extractText(req.file);
    if (!text || text.length < 20) {
      res.status(400).json({ erro: "Não foi possível extrair texto do arquivo" });
      return;
    }
    const docId = await saveDocWithEmbeddings(
      req.userId, title, text, "pdf",
      req.file.originalname, Math.round(req.file.size / 1024),
    );
    res.json({ id: docId, title, chars: text.length, chunks: chunkText(text).length });
  } catch (e) {
    console.error("notebook upload-file:", e);
    res.status(500).json({ erro: "Erro ao processar arquivo" });
  }
});

// ─── POST /api/notebook/upload-text ──────────────────────────────────────────
router.post("/notebook/upload-text", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { title, content } = req.body as { title: string; content: string };
  if (!title || !content) { res.status(400).json({ erro: "Título e conteúdo obrigatórios" }); return; }

  try {
    const docId = await saveDocWithEmbeddings(req.userId, title, content, "text");
    res.json({ id: docId, title, chars: content.length, chunks: chunkText(content).length });
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
    const html = await r.text();
    // Strip HTML tags
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim()
      .slice(0, 150_000);

    if (text.length < 100) {
      res.status(400).json({ erro: "Não foi possível extrair conteúdo desta URL" });
      return;
    }

    const docTitle = title || new URL(url).hostname;
    const docId = await saveDocWithEmbeddings(req.userId, docTitle, text, "url", url);
    res.json({ id: docId, title: docTitle, chars: text.length, chunks: chunkText(text).length });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Erro";
    console.error("notebook upload-url:", msg);
    res.status(500).json({ erro: `Não foi possível acessar a URL: ${msg}` });
  }
});

// ─── GET /api/notebook/docs ───────────────────────────────────────────────────
router.get("/notebook/docs", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  try {
    const docs = await db.execute<{
      id: number; title: string; source_file: string | null;
      file_size_kb: number | null; created_at: string; content_length: number;
    }>(sql`
      SELECT id, title, source_file, file_size_kb,
             created_at, LENGTH(content_text) as content_length
      FROM knowledge_documents
      WHERE uploaded_by = ${req.userId}
        AND (is_chunk IS NULL OR is_chunk = false)
      ORDER BY created_at DESC
      LIMIT 50
    `);
    res.json(docs);
  } catch (e) {
    res.status(500).json({ erro: "Erro ao buscar documentos" });
  }
});

// ─── DELETE /api/notebook/docs/:id ───────────────────────────────────────────
router.delete("/notebook/docs/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const docId = parseInt(req.params.id);
  try {
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
    const chunks = await ragSearch(req.userId, docIds ?? null, pergunta, 6);

    if (!chunks.length) {
      res.json({
        resposta: "Não encontrei documentos suficientes para responder. Adicione pelo menos um documento primeiro.",
        fontes: [],
      });
      return;
    }

    const context = chunks
      .map((c, i) => `[Fonte ${i + 1} — "${c.title}" (relevância: ${(c.similarity * 100).toFixed(0)}%)]\n${c.text}`)
      .join("\n\n---\n\n");

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      max_tokens: 1200,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão, assistente de estudos especialista em preparação para o ENEM e vestibulares.
Responda com base EXCLUSIVAMENTE nos trechos abaixo (não invente informações que não estão nas fontes).
Se a resposta não estiver nos trechos, diga "Essa informação não consta nos documentos adicionados."
Cite a fonte usando [Fonte N] quando usar uma informação específica.
Resposta em PT-BR, direta, didática, máximo 4 parágrafos.
Ao final, se houver dica para ENEM relacionada ao tema, adicione em negrito.

FONTES:
${context}`,
        },
        { role: "user", content: pergunta },
      ],
    });

    const resposta = completion.choices[0].message.content ?? "";
    const fontes = chunks.map((c, i) => ({
      numero: i + 1,
      titulo: c.title,
      trecho: c.text.slice(0, 200) + "...",
      relevancia: Math.round(c.similarity * 100),
    }));

    res.json({ resposta, fontes });
  } catch (e) {
    console.error("notebook chat:", e);
    res.status(500).json({ erro: "Erro ao processar pergunta" });
  }
});

// ─── POST /api/notebook/overview ─────────────────────────────────────────────
router.post("/notebook/overview", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    // Check cache
    const cached = await db.execute<{ summary: string; key_topics: string; faq: string }>(sql`
      SELECT summary, key_topics, faq FROM notebook_overviews
      WHERE user_id = ${req.userId} AND doc_id = ${docId}
      LIMIT 1
    `);
    if (cached.length > 0 && cached[0].summary) {
      res.json({
        summary: cached[0].summary,
        keyTopics: typeof cached[0].key_topics === "string" ? JSON.parse(cached[0].key_topics) : cached[0].key_topics,
        faq: typeof cached[0].faq === "string" ? JSON.parse(cached[0].faq) : cached[0].faq,
      });
      return;
    }

    // Get doc content
    const docs = await db.execute<{ content_text: string; title: string }>(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId}
      LIMIT 1
    `);
    if (!docs.length) { res.status(404).json({ erro: "Documento não encontrado" }); return; }
    const { content_text, title } = docs[0];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.3,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `Você é um especialista em análise pedagógica para o ENEM e vestibulares.
Analise o documento e retorne APENAS um JSON válido:
{
  "summary": "Resumo em 3-5 frases do que o documento trata",
  "keyTopics": ["tópico 1", "tópico 2", "tópico 3", "tópico 4", "tópico 5"],
  "faq": [
    { "q": "Pergunta frequente 1?", "a": "Resposta concisa 1" },
    { "q": "Pergunta frequente 2?", "a": "Resposta concisa 2" },
    { "q": "Pergunta frequente 3?", "a": "Resposta concisa 3" },
    { "q": "Pergunta frequente 4?", "a": "Resposta concisa 4" },
    { "q": "Pergunta frequente 5?", "a": "Resposta concisa 5" }
  ]
}`,
        },
        {
          role: "user",
          content: `Título: "${title}"\n\nConteúdo:\n${content_text.slice(0, 12_000)}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const parsed = JSON.parse(clean);

    // Cache
    await db.execute(sql`
      INSERT INTO notebook_overviews (user_id, doc_id, summary, key_topics, faq)
      VALUES (${req.userId}, ${docId}, ${parsed.summary}, ${JSON.stringify(parsed.keyTopics)}, ${JSON.stringify(parsed.faq)})
      ON CONFLICT DO NOTHING
    `);

    res.json({ summary: parsed.summary, keyTopics: parsed.keyTopics, faq: parsed.faq });
  } catch (e) {
    console.error("notebook overview:", e);
    res.status(500).json({ erro: "Erro ao gerar overview" });
  }
});

// ─── POST /api/notebook/study-guide ──────────────────────────────────────────
router.post("/notebook/study-guide", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute<{ content_text: string; title: string }>(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    if (!docs.length) { res.status(404).json({ erro: "Documento não encontrado" }); return; }
    const { content_text, title } = docs[0];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Você é professor especialista em ENEM. Crie um guia de estudo completo.
Retorne APENAS JSON:
{
  "titulo": "Guia de Estudo: [título]",
  "introducao": "Frase motivacional sobre o tema",
  "questoes": [
    {
      "tipo": "conceito|aplicacao|comparacao|analise",
      "pergunta": "Pergunta de estudo?",
      "resposta": "Resposta detalhada com exemplos",
      "dicaEnem": "Como esse tema cai no ENEM?"
    }
  ],
  "cronogramaSugerido": ["Dia 1: ...", "Dia 2: ...", "Dia 3: ..."]
}
Gere 8-10 questões variadas. Foque em compreensão profunda.`,
        },
        {
          role: "user",
          content: `Tema: "${title}"\n\nConteúdo:\n${content_text.slice(0, 12_000)}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    res.json(JSON.parse(clean));
  } catch (e) {
    console.error("notebook study-guide:", e);
    res.status(500).json({ erro: "Erro ao gerar guia" });
  }
});

// ─── POST /api/notebook/flashcards ───────────────────────────────────────────
router.post("/notebook/flashcards", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId, quantidade = 15 } = req.body as { docId: number; quantidade?: number };

  try {
    const docs = await db.execute<{ content_text: string; title: string }>(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    if (!docs.length) { res.status(404).json({ erro: "Documento não encontrado" }); return; }
    const { content_text, title } = docs[0];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.5,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Crie ${quantidade} flashcards de estudo. Retorne APENAS JSON:
{"flashcards": [{"frente": "pergunta", "verso": "resposta clara e completa", "materia": "área do conhecimento", "dificuldade": "facil|medio|dificil"}]}
Varie a dificuldade. Priorize o que cai no ENEM.`,
        },
        {
          role: "user",
          content: `Tema: "${title}"\n\nConteúdo:\n${content_text.slice(0, 10_000)}`,
        },
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
    const docs = await db.execute<{ content_text: string; title: string }>(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    if (!docs.length) { res.status(404).json({ erro: "Documento não encontrado" }); return; }
    const { content_text, title } = docs[0];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.5,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Crie ${quantidade} questões no estilo ENEM (5 alternativas A-E). Retorne APENAS JSON:
{"questoes": [{"enunciado": "texto", "alternativas": {"A": "","B": "","C": "","D": "","E": ""}, "gabarito": "A", "explicacao": "por que é A"}]}`,
        },
        {
          role: "user",
          content: `Tema: "${title}"\n\nConteúdo:\n${content_text.slice(0, 10_000)}`,
        },
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
    const docs = await db.execute<{ content_text: string; title: string }>(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    if (!docs.length) { res.status(404).json({ erro: "Documento não encontrado" }); return; }
    const { content_text, title } = docs[0];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.2,
      max_tokens: 2000,
      messages: [
        {
          role: "system",
          content: `Crie um mapa mental completo e detalhado. Retorne APENAS JSON:
{
  "subject": "Tema principal",
  "color": "#6366f1",
  "topics": [
    {
      "name": "Tópico 1",
      "color": "#ec4899",
      "subtopics": [
        { "name": "Subtópico 1.1", "detail": "detalhe curto" },
        { "name": "Subtópico 1.2", "detail": "detalhe curto" }
      ]
    }
  ]
}
Gere 5-8 tópicos principais, cada um com 3-5 subtópicos. Use cores variadas.`,
        },
        {
          role: "user",
          content: `Documento: "${title}"\n\n${content_text.slice(0, 12_000)}`,
        },
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

// ─── POST /api/notebook/tiagao-explica ───────────────────────────────────────
router.post("/notebook/tiagao-explica", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { docId } = req.body as { docId: number };

  try {
    const docs = await db.execute<{ content_text: string; title: string }>(sql`
      SELECT content_text, title FROM knowledge_documents
      WHERE id = ${docId} AND uploaded_by = ${req.userId} LIMIT 1
    `);
    if (!docs.length) { res.status(404).json({ erro: "Documento não encontrado" }); return; }
    const { content_text, title } = docs[0];

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      temperature: 0.4,
      max_tokens: 3000,
      messages: [
        {
          role: "system",
          content: `Você é o Professor Tiagão. Crie uma aula sobre o documento para a lousa.
Retorne APENAS JSON com o formato da aula:
{
  "titulo": "string",
  "subtitulo": "string — foco ENEM",
  "etapas": [
    {
      "id": 1,
      "narracao": "4-6 frases didáticas e animadas em PT-BR",
      "elementos": [
        {"tipo": "titulo", "texto": "string", "cor": "#1e1b4b"},
        {"tipo": "texto", "texto": "explicação completa"},
        {"tipo": "destaque", "texto": "conceito-chave", "cor": "#bbf7d0", "corTexto": "#166534"},
        {"tipo": "exemplo", "texto": "exemplo real", "cor": "#dbeafe"},
        {"tipo": "seta", "texto": "item importante", "cor": "#6366f1"}
      ],
      "duracao": 30
    }
  ]
}
Gere 4-5 etapas cobrindo todo o conteúdo do documento.`,
        },
        {
          role: "user",
          content: `Documento: "${title}"\n\n${content_text.slice(0, 10_000)}`,
        },
      ],
    });

    const raw = completion.choices[0].message.content ?? "{}";
    const clean = raw.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const aula = JSON.parse(clean);

    // Store in localStorage via response (frontend will navigate to /aula-ia with this data)
    res.json({ aula, titulo: title });
  } catch (e) {
    console.error("notebook tiagao-explica:", e);
    res.status(500).json({ erro: "Erro ao gerar aula" });
  }
});

export default router;
