import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import universitiesRouter from "./universities";
import applicationsRouter from "./applications";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/students", studentsRouter);
router.use("/universities", universitiesRouter);
router.use("/applications", applicationsRouter);

export default router;
