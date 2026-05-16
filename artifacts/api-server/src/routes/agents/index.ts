import { Router, type IRouter } from "express";
import gestaoRouter from "./gestao";
import crescimentoRouter from "./crescimento";
import marketingRouter from "./marketing";
import inboxRouter from "./inbox";
import hermesRouter from "./hermes";
import uxLayoutRouter from "./ux_layout";
import sucessoAlunoRouter from "./sucesso_aluno";
import qaSinteticoRouter from "./qa_sintetico";
import { initHermes } from "../../lib/hermes/bootstrap";

initHermes();

const router: IRouter = Router();

router.use("/agents/gestao", gestaoRouter);
router.use("/agents/crescimento", crescimentoRouter);
router.use("/agents/marketing", marketingRouter);
router.use("/agents/inbox", inboxRouter);
router.use("/agents/hermes", hermesRouter);
router.use("/agents/ux_layout", uxLayoutRouter);
router.use("/agents/sucesso_aluno", sucessoAlunoRouter);
router.use("/agents/qa_sintetico", qaSinteticoRouter);

export default router;
