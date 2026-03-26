import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studyaiRouter from "./studyai";

const router: IRouter = Router();

router.use(healthRouter);
router.use(studyaiRouter);

export default router;
