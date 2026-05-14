/**
 * /api/concursos — placeholder router.
 * TODO: implement concursos endpoints.
 */

import { Router, type IRouter } from "express";

const router: IRouter = Router();

// Placeholder — returns empty list until concursos feature is implemented.
router.get("/concursos", (_req, res) => {
  res.json({ concursos: [] });
});

export default router;
