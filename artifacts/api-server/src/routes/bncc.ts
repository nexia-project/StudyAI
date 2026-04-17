/**
 * BNCC — Base Nacional Comum Curricular
 * Rotas para busca, navegação e integração pedagógica das habilidades BNCC.
 *
 * GET  /bncc/areas                          — lista áreas do conhecimento
 * GET  /bncc/componentes?area=MAT           — lista componentes de uma área
 * GET  /bncc/buscar?q=query&area=MAT&comp=Física — busca habilidades
 * GET  /bncc/habilidade/:codigo             — detalhe de uma habilidade
 * POST /bncc/mapear                         — mapeia texto/pergunta para habilidades BNCC
 */

import { Router, type IRouter, type Request, type Response } from "express";
import {
  BNCC_AREAS,
  BNCC_HABILIDADES,
  searchBncc,
  getBnccContext,
  type BnccHabilidade,
} from "../data/bncc-data";

const router: IRouter = Router();

// ─── GET /bncc/areas ──────────────────────────────────────────────────────────
router.get("/bncc/areas", (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  res.json({ areas: BNCC_AREAS, total: BNCC_AREAS.length });
});

// ─── GET /bncc/componentes?area=MAT ──────────────────────────────────────────
router.get("/bncc/componentes", (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const area = String(req.query.area || "").trim();
  const filtered = area
    ? BNCC_AREAS.filter(a => a.codigo === area || a.nome.toLowerCase().includes(area.toLowerCase()))
    : BNCC_AREAS;
  const componentes = [...new Set(filtered.flatMap(a => a.componentes))];
  res.json({ componentes, area: area || null });
});

// ─── GET /bncc/buscar ─────────────────────────────────────────────────────────
router.get("/bncc/buscar", (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const q = String(req.query.q || "").trim();
  const area = String(req.query.area || "").trim() || undefined;
  const comp = String(req.query.comp || "").trim() || undefined;
  const limit = Math.min(parseInt(String(req.query.limit || "20")), 50);

  if (!q && !area && !comp) {
    // Return all — paginated
    const page = Math.max(0, parseInt(String(req.query.page || "0")));
    const items = BNCC_HABILIDADES.slice(page * limit, page * limit + limit);
    res.json({ habilidades: items, total: BNCC_HABILIDADES.length, page });
    return;
  }

  if (!q) {
    // Filter by area/componente only
    let pool = BNCC_HABILIDADES;
    if (area) pool = pool.filter(h => h.area === area);
    if (comp) pool = pool.filter(h => h.componente.toLowerCase().includes(comp.toLowerCase()));
    res.json({ habilidades: pool.slice(0, limit), total: pool.length });
    return;
  }

  const results = searchBncc(q, comp, area);
  res.json({ habilidades: results.slice(0, limit), total: results.length, query: q });
});

// ─── GET /bncc/habilidade/:codigo ─────────────────────────────────────────────
router.get("/bncc/habilidade/:codigo", (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const codigo = req.params.codigo.toUpperCase();
  const habilidade = BNCC_HABILIDADES.find(h => h.codigo === codigo);
  if (!habilidade) { res.status(404).json({ erro: "Habilidade não encontrada" }); return; }

  // Find related habilidades (same área + overlapping tags)
  const related = BNCC_HABILIDADES
    .filter(h => h.codigo !== codigo && h.area === habilidade.area)
    .filter(h => h.tags.some(t => habilidade.tags.includes(t)))
    .slice(0, 5);

  res.json({ habilidade, related });
});

// ─── POST /bncc/mapear ────────────────────────────────────────────────────────
// Body: { texto: string, componente?: string }
// Returns BNCC habilidades related to the question/topic
router.post("/bncc/mapear", (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const { texto, componente } = req.body as { texto?: string; componente?: string };
  if (!texto) { res.status(400).json({ erro: "texto obrigatório" }); return; }

  const results = searchBncc(texto, componente);
  const context = getBnccContext(texto, componente);

  res.json({
    habilidades: results.slice(0, 8),
    total: results.length,
    context_block: context,
    source: "BNCC — Base Nacional Comum Curricular (MEC, 2018)",
  });
});

// ─── GET /bncc/componente/:nome — all habilidades of a subject ────────────────
router.get("/bncc/componente/:nome", (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ erro: "Não autenticado" }); return; }
  const nome = decodeURIComponent(req.params.nome);
  const habilidades = BNCC_HABILIDADES.filter(h =>
    h.componente.toLowerCase().includes(nome.toLowerCase())
  );
  const area = BNCC_AREAS.find(a => a.componentes.some(c => c.toLowerCase().includes(nome.toLowerCase())));
  res.json({ componente: nome, area: area || null, habilidades, total: habilidades.length });
});

export { getBnccContext };
export default router;
