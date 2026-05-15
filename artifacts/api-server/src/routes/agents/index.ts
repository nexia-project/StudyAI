import { Router, type IRouter } from "express";
import gestaoRouter from "./gestao";
import crescimentoRouter from "./crescimento";
import marketingRouter from "./marketing";
import inboxRouter from "./inbox";
import uxLayoutRouter from "./ux_layout";
import { initHermes } from "../../lib/hermes/bootstrap";

initHermes();

const router: IRouter = Router();

router.use("/agents/gestao", gestaoRouter);
router.use("/agents/crescimento", crescimentoRouter);
router.use("/agents/marketing", marketingRouter);
router.use("/agents/inbox", inboxRouter);
router.use("/agents/ux_layout", uxLayoutRouter);

export default router;
