import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import universitiesRouter from "./universities";
import applicationsRouter from "./applications";
import authRouter from "./auth";
import storageRouter from "./storage";
import documentsRouter from "./documents";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/students", studentsRouter);
router.use("/universities", universitiesRouter);
router.use("/applications", applicationsRouter);
router.use(storageRouter);
router.use("/documents", documentsRouter);

export default router;
