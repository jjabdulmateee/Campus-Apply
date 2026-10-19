import { Router } from "express";
import { db } from "@workspace/db";
import {
  applicationsTable,
  universitiesTable,
  programsTable,
  applicationAnswersTable,
  userCollegesTable,
} from "@workspace/db";
import {
  CreateApplicationBody,
  UpdateApplicationParams,
  GetApplicationParams,
  WithdrawApplicationParams,
  SubmitApplicationParams,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { requireStudent, getStudentId } from "../middleware/auth";
import {
  getOwnedApplication,
  validateApplication,
  submitApplication,
  SubmissionError,
} from "../lib/submission";

const router = Router();
router.use(requireStudent);

// ─── Summary ──────────────────────────────────────────────────────────────────
router.get("/summary", async (req, res) => {
  const sid = getStudentId(req);
  const apps = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.studentId, sid));

  res.json({
    total: apps.length,
    draft: apps.filter((a) => a.status === "draft").length,
    submitted: apps.filter((a) => a.status === "submitted").length,
    under_review: apps.filter((a) => a.status === "under_review").length,
    accepted: apps.filter((a) => a.status === "accepted").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
    waitlisted: apps.filter((a) => a.status === "waitlisted").length,
  });
});

// ─── List ─────────────────────────────────────────────────────────────────────
router.get("/", async (req, res) => {
  const sid = getStudentId(req);
  const apps = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.studentId, sid));

  const enriched = await Promise.all(
    apps.map(async (a) => {
      const uni = await db.query.universitiesTable.findFirst({
        where: eq(universitiesTable.id, a.universityId),
      });
      const prog = await db.query.programsTable.findFirst({
        where: eq(programsTable.id, a.programId),
      });
      return {
        ...a,
        universityName: uni?.name ?? "Unknown University",
        programName: prog?.name ?? "Unknown Program",
      };
    }),
  );

  res.json(enriched);
});

// ─── Create ───────────────────────────────────────────────────────────────────
/**
 * Idempotent: if the student already has a live application for this
 * university + program it is returned instead of creating a duplicate, so a
 * single canonical row reaches the admin queue.
 */
router.post("/", async (req, res) => {
  const sid = getStudentId(req);
  const body = CreateApplicationBody.parse(req.body);

  const existing = await db.query.applicationsTable.findFirst({
    where: and(
      eq(applicationsTable.studentId, sid),
      eq(applicationsTable.universityId, body.universityId),
      eq(applicationsTable.programId, body.programId),
    ),
  });

  let app = existing;
  let created = false;
  if (!app || app.status === "withdrawn") {
    [app] = await db
      .insert(applicationsTable)
      .values({ ...body, studentId: sid, status: "draft" })
      .returning();
    created = true;
  }

  const uni = await db.query.universitiesTable.findFirst({
    where: eq(universitiesTable.id, body.universityId),
  });
  const prog = await db.query.programsTable.findFirst({
    where: eq(programsTable.id, body.programId),
  });

  res.status(created ? 201 : 200).json({
    ...app,
    universityName: uni?.name ?? "Unknown University",
    programName: prog?.name ?? "Unknown Program",
  });
});

// ─── Review (aggregated) ──────────────────────────────────────────────────────
router.get("/:applicationId/review", async (req, res) => {
  const sid = getStudentId(req);
  const { applicationId } = GetApplicationParams.parse(req.params);

  let app;
  try {
    app = await getOwnedApplication(sid, applicationId);
  } catch (err) {
    if (err instanceof SubmissionError) {
      res.status(err.httpStatus).json({ error: err.message });
      return;
    }
    throw err;
  }

  const { validation, packet, university, program } = await validateApplication(sid, app);

  res.json({
    application: {
      ...app,
      universityName: university?.name ?? "Unknown",
      programName: program?.name ?? "Unknown",
    },
    university,
    program,
    student: packet.profile,
    academics: packet.academics,
    tests: packet.tests,
    activities: packet.activities,
    essays: packet.essays,
    answers: packet.answers,
    documents: packet.documents,
    validation,
  });
});

// ─── Supplement Answers ───────────────────────────────────────────────────────
const SaveAnswersBody = z.object({
  answers: z.array(
    z.object({
      questionKey: z.string(),
      questionText: z.string(),
      answer: z.string().nullable().optional(),
    }),
  ),
});

router.get("/:applicationId/answers", async (req, res) => {
  const sid = getStudentId(req);
  const { applicationId } = GetApplicationParams.parse(req.params);

  const app = await db.query.applicationsTable.findFirst({
    where: and(
      eq(applicationsTable.id, applicationId),
      eq(applicationsTable.studentId, sid),
    ),
  });
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const answers = await db
    .select()
    .from(applicationAnswersTable)
    .where(
      and(
        eq(applicationAnswersTable.applicationId, applicationId),
        eq(applicationAnswersTable.studentId, sid),
      ),
    );

  res.json(answers);
});

router.put("/:applicationId/answers", async (req, res) => {
  const sid = getStudentId(req);
  const { applicationId } = GetApplicationParams.parse(req.params);
  const { answers } = SaveAnswersBody.parse(req.body);

  const app = await db.query.applicationsTable.findFirst({
    where: and(
      eq(applicationsTable.id, applicationId),
      eq(applicationsTable.studentId, sid),
    ),
  });
  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  // Delete existing answers for this application and reinsert
  await db
    .delete(applicationAnswersTable)
    .where(
      and(
        eq(applicationAnswersTable.applicationId, applicationId),
        eq(applicationAnswersTable.studentId, sid),
      ),
    );

  if (answers.length > 0) {
    await db.insert(applicationAnswersTable).values(
      answers.map((a) => ({
        applicationId,
        studentId: sid,
        questionKey: a.questionKey,
        questionText: a.questionText,
        answer: a.answer ?? null,
        updatedAt: new Date(),
      })),
    );
  }

  const saved = await db
    .select()
    .from(applicationAnswersTable)
    .where(
      and(
        eq(applicationAnswersTable.applicationId, applicationId),
        eq(applicationAnswersTable.studentId, sid),
      ),
    );

  res.json(saved);
});

// ─── Get Single ───────────────────────────────────────────────────────────────
router.get("/:applicationId", async (req, res) => {
  const sid = getStudentId(req);
  const { applicationId } = GetApplicationParams.parse(req.params);
  const app = await db.query.applicationsTable.findFirst({
    where: and(
      eq(applicationsTable.id, applicationId),
      eq(applicationsTable.studentId, sid),
    ),
  });

  if (!app) {
    res.status(404).json({ error: "Not found" });
    return;
  }

  const uni = await db.query.universitiesTable.findFirst({
    where: eq(universitiesTable.id, app.universityId),
  });
  const prog = await db.query.programsTable.findFirst({
    where: eq(programsTable.id, app.programId),
  });

  res.json({
    ...app,
    universityName: uni?.name ?? "Unknown",
    programName: prog?.name ?? "Unknown",
  });
});

// ─── Update ───────────────────────────────────────────────────────────────────
/**
 * Students may only edit free-text notes here. Status transitions are owned by
 * the submit/withdraw endpoints (student) and /api/admin/.../decision (admin).
 */
const StudentUpdateApplicationBody = z.object({
  notes: z.string().optional(),
});

router.put("/:applicationId", async (req, res) => {
  const sid = getStudentId(req);
  const { applicationId } = UpdateApplicationParams.parse(req.params);

  if (req.body && typeof req.body === "object" && "status" in req.body) {
    res.status(403).json({
      error: "Application status cannot be changed through this endpoint",
    });
    return;
  }

  const parsed = StudentUpdateApplicationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid application data" });
    return;
  }

  const [updated] = await db
    .update(applicationsTable)
    .set({ notes: parsed.data.notes, updatedAt: new Date() })
    .where(
      and(
        eq(applicationsTable.id, applicationId),
        eq(applicationsTable.studentId, sid),
      ),
    )
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const uni = await db.query.universitiesTable.findFirst({
    where: eq(universitiesTable.id, updated.universityId),
  });
  const prog = await db.query.programsTable.findFirst({
    where: eq(programsTable.id, updated.programId),
  });

  res.json({
    ...updated,
    universityName: uni?.name ?? "Unknown",
    programName: prog?.name ?? "Unknown",
  });
});

// ─── Withdraw ─────────────────────────────────────────────────────────────────
router.delete("/:applicationId", async (req, res) => {
  const sid = getStudentId(req);
  const { applicationId } = WithdrawApplicationParams.parse(req.params);

  const [app] = await db
    .select()
    .from(applicationsTable)
    .where(
      and(
        eq(applicationsTable.id, applicationId),
        eq(applicationsTable.studentId, sid),
      ),
    )
    .limit(1);

  if (!app) {
    res.status(404).json({ error: "Application not found" });
    return;
  }

  const withdrawable = ["submitted", "under_review", "waitlisted"];
  if (!withdrawable.includes(app.status)) {
    res.status(400).json({
      error: "Only submitted applications can be withdrawn",
    });
    return;
  }

  await db
    .update(applicationsTable)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(
      and(
        eq(applicationsTable.id, applicationId),
        eq(applicationsTable.studentId, sid),
      ),
    );

  await db
    .update(userCollegesTable)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(
      and(
        eq(userCollegesTable.studentId, sid),
        eq(userCollegesTable.universityId, app.universityId),
      ),
    );

  res.status(204).send();
});

// ─── Submit ───────────────────────────────────────────────────────────────────
router.post("/:applicationId/submit", async (req, res) => {
  const sid = getStudentId(req);
  const { applicationId } = SubmitApplicationParams.parse(req.params);
  const signature =
    typeof req.body?.signature === "string" ? req.body.signature.trim() : undefined;

  try {
    const application = await getOwnedApplication(sid, applicationId);
    const result = await submitApplication({
      studentId: sid,
      application,
      signature,
      paymentSimulated: req.body?.paymentSimulated === true,
    });
    res.json({
      ...result.application,
      universityName: result.universityName,
      programName: result.programName,
      paymentTransactionRef: result.paymentTransactionRef,
      paymentAmountPkr: result.paymentAmountPkr,
    });
  } catch (err) {
    if (err instanceof SubmissionError) {
      res.status(err.httpStatus).json({
        error: err.message,
        ...(err.missing.length > 0 ? { missing: err.missing } : {}),
      });
      return;
    }
    throw err;
  }
});

export default router;
