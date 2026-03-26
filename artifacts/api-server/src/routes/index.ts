import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studyaiRouter from "./studyai";
import chatRouter from "./chat";
import simuladoRouter from "./simulado";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studyaiRouter);
router.use(chatRouter);
router.use(simuladoRouter);

export default router;
