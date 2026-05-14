import { Router, type IRouter } from "express";
import gestaoRouter from "./gestao";
import crescimentoRouter from "./crescimento";
import { initHermes } from "../../lib/hermes/bootstrap";

initHermes();

const router: IRouter = Router();

router.use("/agents/gestao", gestaoRouter);
router.use("/agents/crescimento", crescimentoRouter);

export default router;
