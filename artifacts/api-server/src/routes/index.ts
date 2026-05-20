import { Router, type IRouter } from "express";
import healthRouter from "./health";
import studentsRouter from "./students";
import universitiesRouter from "./universities";
import applicationsRouter from "./applications";
import authRouter from "./auth";
import storageRouter from "./storage";
import documentsRouter from "./documents";
import adminRouter from "./admin";
import accountRouter from "./account";
import supportRouter from "./support";
import recommendersRouter from "./recommenders";
import portalRouter from "./portal";
import notificationsRouter from "./notifications";
import counselorRouter from "./counselor";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/students", studentsRouter);
router.use("/students", recommendersRouter);
router.use("/recommenders", portalRouter);
router.use("/universities", universitiesRouter);
router.use("/applications", applicationsRouter);
router.use(storageRouter);
router.use("/documents", documentsRouter);
router.use("/admin", adminRouter);
router.use("/account", accountRouter);
router.use("/support", supportRouter);
router.use("/notifications", notificationsRouter);
router.use("/counselor", counselorRouter);

export default router;
