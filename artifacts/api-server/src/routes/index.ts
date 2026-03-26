import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studyaiRouter from "./studyai";
import chatRouter from "./chat";
import simuladoRouter from "./simulado";
import flashcardsRouter from "./flashcards";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studyaiRouter);
router.use(chatRouter);
router.use(simuladoRouter);
router.use(flashcardsRouter);

export default router;
