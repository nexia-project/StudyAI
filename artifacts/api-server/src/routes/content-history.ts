import { Router, type IRouter, type Request, type Response } from "express";
import {
  listContent,
  getContent,
  softDeleteContent,
  type ContentKind,
  type OwnerRole,
} from "../lib/contentHistory";

const router: IRouter = Router();

const VALID_KINDS = new Set([
  "resumao", "slides", "mapa_mental", "infografico",
  "material_premium", "lesson_plan", "exam", "research", "content_package",
]);
const VALID_ROLES = new Set(["student", "teacher"]);

// GET /api/content/history?kind=&role=&search=&limit=&offset=
router.get("/content/history", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  try {
    const kindRaw = String(req.query.kind ?? "").trim();
    const roleRaw = String(req.query.role ?? "").trim();
    const search = String(req.query.search ?? "").trim();
    const limit = Math.min(Number(req.query.limit ?? 50) || 50, 100);
    const offset = Math.max(Number(req.query.offset ?? 0) || 0, 0);

    const kind = VALID_KINDS.has(kindRaw) ? (kindRaw as ContentKind) : null;
    const role = VALID_ROLES.has(roleRaw) ? (roleRaw as OwnerRole) : undefined;

    const result = await listContent({
      ownerId: req.userId,
      ownerRole: role,
      kind,
      search: search || undefined,
      limit, offset,
    });
    res.json(result);
  } catch (err) {
    console.error("[content/history]", err);
    res.status(500).json({ error: "Erro ao listar conteúdos" });
  }
});

// GET /api/content/:id
router.get("/content/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    const item = await getContent(req.userId, id);
    if (!item) { res.status(404).json({ error: "Não encontrado" }); return; }
    res.json({ item });
  } catch (err) {
    console.error("[content/:id]", err);
    res.status(500).json({ error: "Erro ao buscar conteúdo" });
  }
});

// DELETE /api/content/:id — soft delete
router.delete("/content/:id", async (req: Request, res: Response) => {
  if (!req.userId) { res.status(401).json({ error: "Não autenticado" }); return; }
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) { res.status(400).json({ error: "ID inválido" }); return; }
  try {
    const ok = await softDeleteContent(req.userId, id);
    if (!ok) { res.status(404).json({ error: "Não encontrado" }); return; }
    res.json({ ok: true });
  } catch (err) {
    console.error("[content/:id DELETE]", err);
    res.status(500).json({ error: "Erro ao deletar" });
  }
});

export default router;
