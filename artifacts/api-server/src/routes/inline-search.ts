/**
 * /api/inline-search + /api/files/analyze
 *
 * Endpoints dedicados ao hero do `/app` (Home.tsx). O objetivo é deixar a
 * pesquisa e o upload de arquivo INLINE — sem encaminhar para o Tiagão.
 * O painel do Tiagão continua existindo com seu próprio input; estas rotas
 * são módulos independentes, conforme pedido do fundador.
 *
 * Decisões:
 *
 * • POST /api/inline-search
 *     - Por que NÃO reusar /api/chat? `/api/chat` é SSE streaming, carrega
 *       memória/perfil/perf/KB/tools — é caro e complexo para um campo de busca.
 *     - Por que NÃO reusar /api/rag/external-multi sozinho? Ele devolve só
 *       snippets, sem resposta gerada. UX de "busca" pede texto curto + fontes.
 *     - Aqui combinamos: `searchExternalRag` + um único call de LLM (OR.fast,
 *       cheap) para sintetizar uma resposta curta com citações `[Fonte N]`.
 *
 * • POST /api/files/analyze
 *     - Por que NÃO reusar /api/notebook/upload-file? Aquele endpoint persiste
 *       no Notebook do usuário. O Home quer analisar inline sem salvar;
 *       o botão "Salvar no Notebook" do Home chama o endpoint persistente
 *       explicitamente.
 *     - Aqui rodamos só extração + resumo curto. Sem chunking, sem DB.
 *     - Aceita PDF/DOCX/TXT/CSV/XLSX/EPUB (via `extractText` do notebook) e
 *       imagens (JPG/PNG/WEBP via vision OCR — mesmo modelo do upload-image).
 *
 * Auth: usa `req.userId` (setado por `optionalAuth` no app.ts). Endpoints
 * rejeitam 401 quando não autenticado — paridade com /api/notebook/*.
 */

import { Router, type IRouter, type Request, type Response } from "express";
import multer from "multer";
import { openrouter, OR } from "../lib/aiClient";
import { logAiUsage } from "../lib/aiCostLogger";
import {
  pickProvidersForQuery,
  searchExternalRag,
  type ExternalSource,
  type RagProvider,
} from "../lib/external-rag/aggregate.js";
import { extractText } from "./notebook";

const router: IRouter = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

// MIMEs aceitos no /api/files/analyze (PDF/Office + imagens).
const TEXT_MIMES = new Set([
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/epub+zip",
  "text/plain",
  "text/csv",
]);
const IMAGE_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

function detectKind(mime: string, name: string): "pdf" | "docx" | "doc" | "pptx" | "xlsx" | "csv" | "epub" | "txt" | "image" | "unknown" {
  const n = name.toLowerCase();
  if (IMAGE_MIMES.has(mime)) return "image";
  if (mime === "application/pdf" || n.endsWith(".pdf")) return "pdf";
  if (
    mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    n.endsWith(".docx")
  ) return "docx";
  if (mime === "application/msword" || n.endsWith(".doc")) return "doc";
  if (
    mime === "application/vnd.openxmlformats-officedocument.presentationml.presentation" ||
    n.endsWith(".pptx")
  ) return "pptx";
  if (
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    n.endsWith(".xlsx") || n.endsWith(".xls")
  ) return "xlsx";
  if (mime === "text/csv" || n.endsWith(".csv")) return "csv";
  if (mime === "application/epub+zip" || n.endsWith(".epub")) return "epub";
  if (mime === "text/plain" || n.endsWith(".txt") || n.endsWith(".md")) return "txt";
  return "unknown";
}

// ─── POST /api/inline-search ─────────────────────────────────────────────────
interface InlineSearchPayload {
  query?: unknown;
  providers?: unknown;
}

interface InlineCitation {
  numero: number;
  titulo: string;
  trecho: string;
  trechoCompleto?: string;
  provider: "user-doc" | "semantic-scholar";
  ragProvider: RagProvider;
  autores?: string[];
  ano?: number | null;
  venue?: string | null;
  url?: string;
  doi?: string | null;
}

const PROVIDER_LABEL: Record<RagProvider, string> = {
  "semantic-scholar": "Semantic Scholar",
  scielo: "SciELO",
  wikipedia: "Wikipédia",
  wikidata: "Wikidata",
  ibge: "IBGE",
  arxiv: "arXiv",
  crossref: "Crossref",
};

function mapToCitations(sources: ExternalSource[]): InlineCitation[] {
  return sources.map((s, idx) => {
    const numero = idx + 1;
    // O CitationChip atual só conhece dois "providers" visuais. Tratamos toda
    // fonte externa como "semantic-scholar" (chip azul + ícone livro). O nome
    // real do provedor vai em `ragProvider` (para "Levar pro Tiagão") e
    // também no campo `autores[0]` quando não há autores reais — assim o
    // subtítulo do CitationListItem mostra "Wikipédia · 2025", "SciELO · …" etc.
    const realAuthors = Array.isArray(s.authors) && s.authors.length > 0 ? s.authors : null;
    const fallbackAuthor = PROVIDER_LABEL[s.provider] ?? s.provider;
    return {
      numero,
      titulo: s.title || "Fonte sem título",
      trecho: (s.snippet || "").slice(0, 320),
      trechoCompleto: s.abstract || s.snippet || "",
      provider: "semantic-scholar",
      ragProvider: s.provider,
      autores: realAuthors ?? [fallbackAuthor],
      ano: s.year ?? null,
      venue: s.venue ?? null,
      url: s.url,
      doi: s.doi ?? null,
    };
  });
}

function buildSourcesBlock(sources: ExternalSource[]): string {
  if (sources.length === 0) return "";
  const lines = sources.map((s, idx) => {
    const provider = PROVIDER_LABEL[s.provider] ?? s.provider;
    const year = s.year ? ` (${s.year})` : "";
    const venue = s.venue ? ` — ${s.venue}` : "";
    const snippet = (s.abstract || s.snippet || "").replace(/\s+/g, " ").slice(0, 600);
    return `[Fonte ${idx + 1}] ${provider}${year}${venue} — ${s.title}\n${snippet}`;
  });
  return lines.join("\n\n");
}

router.post("/inline-search", async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }
  const body = (req.body ?? {}) as InlineSearchPayload;
  const query = typeof body.query === "string" ? body.query.trim() : "";
  if (query.length < 2 || query.length > 500) {
    res.status(400).json({ erro: "Pergunta deve ter entre 2 e 500 caracteres." });
    return;
  }

  const t0 = Date.now();
  try {
    const providers = pickProvidersForQuery(query);
    const sources = await searchExternalRag(query, providers, {
      perProviderLimit: 3,
      totalLimit: 8,
    });

    // Sem fontes externas → ainda gera uma resposta (sem citações). Útil pra
    // perguntas conversacionais que não exigem fato verificável.
    const sourcesBlock = buildSourcesBlock(sources);
    const systemPrompt = `Você é o assistente de busca inline do StudyAI. Responda em pt-BR, de forma direta, didática e curta (máximo 4 parágrafos).

REGRAS DE CITAÇÃO:
- Se houver FONTES injetadas, cite usando o formato exato \`[Fonte N]\` (com colchetes, número, sem ponto).
- Use APENAS o que está nas fontes — não invente DOI, autor, ano ou estatística.
- Se nenhuma fonte cobrir a pergunta, responda com base em conhecimento geral e diga ao final: "Não encontrei fontes oficiais para citar — quer que eu busque de novo?"
- Nada de emojis. Nada de saudação. Vai direto.`;

    const userContent = sourcesBlock
      ? `Pergunta: ${query}\n\nFontes consultadas:\n\n${sourcesBlock}\n\nResponda agora, citando [Fonte N] quando usar uma fonte.`
      : `Pergunta: ${query}\n\nNenhuma fonte externa retornou. Responda com base em conhecimento geral.`;

    let answer = "";
    try {
      const completion = await openrouter.chat.completions.create({
        model: OR.fast,
        max_tokens: 700,
        temperature: 0.4,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
      });
      answer = (completion.choices[0]?.message?.content ?? "").trim();
      if (completion.usage) {
        logAiUsage({
          feature: "inline-search",
          model: OR.fast,
          tokensIn: completion.usage.prompt_tokens ?? 0,
          tokensOut: completion.usage.completion_tokens ?? 0,
        });
      }
    } catch (e) {
      console.error("inline-search llm:", e);
      // Fallback: devolve só as fontes — o frontend ainda tem o que mostrar.
      answer = sources.length > 0
        ? "Não consegui gerar um resumo agora, mas separei algumas fontes que respondem essa busca. Clique nelas para ver os detalhes."
        : "Não consegui buscar agora. Tenta de novo em alguns segundos.";
    }

    const citations = mapToCitations(sources);
    res.json({
      query,
      answer,
      citations,
      providers,
      ms: Date.now() - t0,
    });
  } catch (e) {
    console.error("inline-search:", e);
    res.status(500).json({ erro: "Erro ao processar busca. Tenta de novo." });
  }
});

// ─── POST /api/files/analyze ─────────────────────────────────────────────────
// Sobe arquivo, extrai texto/OCR, gera resumo curto. NÃO persiste no Notebook
// (esse é o "Salvar no Notebook" — botão separado que chama
// /api/notebook/upload-file).
router.post("/files/analyze", upload.single("file"), async (req: Request, res: Response) => {
  if (!req.userId) {
    res.status(401).json({ erro: "Não autenticado" });
    return;
  }
  if (!req.file) {
    res.status(400).json({ erro: "Arquivo obrigatório (campo 'file')." });
    return;
  }

  const file = req.file;
  const mime = file.mimetype;
  const isImage = IMAGE_MIMES.has(mime);
  const isText = TEXT_MIMES.has(mime);
  if (!isImage && !isText) {
    res.status(400).json({
      erro: "Tipo de arquivo não suportado. Envie PDF, DOC/DOCX, PPTX, XLSX/CSV, TXT, EPUB ou imagem (JPG/PNG/WEBP).",
    });
    return;
  }

  const filename = file.originalname || "arquivo";
  const kind = detectKind(mime, filename);

  try {
    let extractedText = "";

    if (isImage) {
      // Vision OCR — mesma estratégia do /api/notebook/upload-image (notebook.ts:811).
      const b64 = file.buffer.toString("base64");
      const completion = await openrouter.chat.completions.create({
        model: OR.vision,
        max_tokens: 2500,
        messages: [
          {
            role: "system",
            content: "Você extrai TODO o texto visível na imagem (OCR), preservando estrutura, parágrafos, listas, fórmulas. Se for diagrama/gráfico, descreva exaustivamente. Responda apenas com o conteúdo extraído, sem comentários.",
          },
          {
            role: "user",
            content: [
              { type: "image_url", image_url: { url: `data:${mime};base64,${b64}` } },
              { type: "text", text: "Extraia o conteúdo desta imagem em texto estruturado, em português." },
            ],
          },
        ],
      });
      extractedText = (completion.choices[0]?.message?.content ?? "").trim();
      if (completion.usage) {
        logAiUsage({
          feature: "inline-file-ocr",
          model: OR.vision,
          tokensIn: completion.usage.prompt_tokens ?? 0,
          tokensOut: completion.usage.completion_tokens ?? 0,
        });
      }
    } else {
      extractedText = await extractText(file);
    }

    if (!extractedText || extractedText.length < 20) {
      res.status(422).json({
        erro: "Não foi possível extrair texto deste arquivo. Verifique se ele tem conteúdo legível.",
        filename,
        mimeType: mime,
        kind,
        sizeKb: Math.round(file.size / 1024),
      });
      return;
    }

    // Resumo curto (best-effort — se falhar, devolvemos só o texto extraído).
    let summary = "";
    try {
      const truncated = extractedText.slice(0, 12_000);
      const summaryRes = await openrouter.chat.completions.create({
        model: OR.fast,
        max_tokens: 600,
        temperature: 0.35,
        messages: [
          {
            role: "system",
            content: `Você analisa documentos para estudantes brasileiros (ENEM/vestibular/concursos). Em pt-BR, gere um resumo conciso (3-5 parágrafos curtos), destacando:
1. Do que se trata o documento.
2. Pontos principais ou tópicos abordados.
3. Como o aluno pode usar isso pra estudar (dica prática, 1 frase).
Escreva em texto corrido (pode usar bullets simples com "- "). Sem markdown pesado (sem negrito **, sem títulos #). Sem saudação. Sem emojis.`,
          },
          {
            role: "user",
            content: `Arquivo: ${filename} (${kind})\n\nConteúdo extraído:\n\n${truncated}`,
          },
        ],
      });
      summary = (summaryRes.choices[0]?.message?.content ?? "").trim();
      if (summaryRes.usage) {
        logAiUsage({
          feature: "inline-file-summary",
          model: OR.fast,
          tokensIn: summaryRes.usage.prompt_tokens ?? 0,
          tokensOut: summaryRes.usage.completion_tokens ?? 0,
        });
      }
    } catch (e) {
      console.warn("[files/analyze] summary failed:", e instanceof Error ? e.message : e);
      summary = "";
    }

    res.json({
      filename,
      mimeType: mime,
      kind,
      sizeKb: Math.round(file.size / 1024),
      chars: extractedText.length,
      extractedText: extractedText.slice(0, 50_000),
      summary,
    });
  } catch (e) {
    console.error("files/analyze:", e);
    const msg = e instanceof Error ? e.message : String(e);
    res.status(500).json({ erro: `Erro ao analisar arquivo: ${msg}` });
  }
});

export default router;
