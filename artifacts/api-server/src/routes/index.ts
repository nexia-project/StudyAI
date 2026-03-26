import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import studyaiRouter from "./studyai";
import chatRouter from "./chat";
import simuladoRouter from "./simulado";
import flashcardsRouter from "./flashcards";
import historyRouter from "./history";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(studyaiRouter);
router.use(chatRouter);
router.use(simuladoRouter);
router.use(flashcardsRouter);
router.use(historyRouter);

export default router;
