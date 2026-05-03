import { Router } from "express";
import { db } from "@workspace/db";
import {
  applicationsTable,
  universitiesTable,
  programsTable,
  studentProfilesTable,
  academicRecordsTable,
  testScoresTable,
  activitiesTable,
  essaysTable,
  applicationAnswersTable,
} from "@workspace/db";
import {
  CreateApplicationBody,
  UpdateApplicationBody,
  UpdateApplicationParams,
  GetApplicationParams,
  WithdrawApplicationParams,
  SubmitApplicationParams,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { optionalJWT, getStudentId } from "../middleware/auth";

const router = Router();
router.use(optionalJWT);

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
router.post("/", async (req, res) => {
  const sid = getStudentId(req);
  const body = CreateApplicationBody.parse(req.body);
  const [app] = await db
    .insert(applicationsTable)
    .values({ ...body, studentId: sid, status: "draft" })
    .returning();

  const uni = await db.query.universitiesTable.findFirst({
    where: eq(universitiesTable.id, body.universityId),
  });
  const prog = await db.query.programsTable.findFirst({
    where: eq(programsTable.id, body.programId),
  });

  res.status(201).json({
    ...app,
    universityName: uni?.name ?? "Unknown University",
    programName: prog?.name ?? "Unknown Program",
  });
});

// ─── Review (aggregated) ──────────────────────────────────────────────────────
router.get("/:applicationId/review", async (req, res) => {
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

  const [uni, prog, student, academics, tests, activities, essays, answers] =
    await Promise.all([
      db.query.universitiesTable.findFirst({
        where: eq(universitiesTable.id, app.universityId),
      }),
      db.query.programsTable.findFirst({
        where: eq(programsTable.id, app.programId),
      }),
      db.query.studentProfilesTable.findFirst({
        where: eq(studentProfilesTable.studentId, sid),
      }),
      db.select().from(academicRecordsTable).where(eq(academicRecordsTable.studentId, sid)),
      db.select().from(testScoresTable).where(eq(testScoresTable.studentId, sid)),
      db.select().from(activitiesTable).where(eq(activitiesTable.studentId, sid)),
      db.select().from(essaysTable).where(eq(essaysTable.studentId, sid)),
      db.select().from(applicationAnswersTable).where(
        and(
          eq(applicationAnswersTable.applicationId, applicationId),
          eq(applicationAnswersTable.studentId, sid),
        ),
      ),
    ]);

  const psEssay = essays.find((e) => e.type === "personal_statement");
  const psWords = psEssay?.content
    ? psEssay.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  const missing: string[] = [];
  if (!student?.firstName || !student?.lastName)
    missing.push("Complete your personal profile (name required)");
  if (academics.length === 0)
    missing.push("Add at least one education record");
  if (tests.length === 0)
    missing.push("Add at least one test score");
  if (psWords < 100)
    missing.push("Write a personal statement (at least 100 words)");

  res.json({
    application: {
      ...app,
      universityName: uni?.name ?? "Unknown",
      programName: prog?.name ?? "Unknown",
    },
    university: uni ?? null,
    program: prog ?? null,
    student: student ?? null,
    academics,
    tests,
    activities,
    essays: essays.map((e) => ({
      ...e,
      wordCount: e.content
        ? e.content.trim().split(/\s+/).filter(Boolean).length
        : 0,
    })),
    answers,
    validation: { canSubmit: missing.length === 0, missing },
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
router.put("/:applicationId", async (req, res) => {
  const sid = getStudentId(req);
  const { applicationId } = UpdateApplicationParams.parse(req.params);
  const body = UpdateApplicationBody.parse(req.body);
  const [updated] = await db
    .update(applicationsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(
      and(
        eq(applicationsTable.id, applicationId),
        eq(applicationsTable.studentId, sid),
      ),
    )
    .returning();

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
  await db
    .update(applicationsTable)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(
      and(
        eq(applicationsTable.id, applicationId),
        eq(applicationsTable.studentId, sid),
      ),
    );
  res.status(204).send();
});

// ─── Submit ───────────────────────────────────────────────────────────────────
router.post("/:applicationId/submit", async (req, res) => {
  const sid = getStudentId(req);
  const { applicationId } = SubmitApplicationParams.parse(req.params);

  // ── Server-side pre-flight validation ──────────────────────────────────────
  const [profile, academics, tests] = await Promise.all([
    db.query.studentProfilesTable.findFirst({
      where: eq(studentProfilesTable.studentId, sid),
    }),
    db.select().from(academicRecordsTable).where(eq(academicRecordsTable.studentId, sid)),
    db.select().from(testScoresTable).where(eq(testScoresTable.studentId, sid)),
  ]);

  const missing: string[] = [];
  if (!profile?.firstName || !profile?.lastName)
    missing.push("Personal profile (first and last name) must be completed");
  if (academics.length === 0)
    missing.push("At least one education record is required");
  if (tests.length === 0)
    missing.push("At least one test score is required");

  if (missing.length > 0) {
    res.status(400).json({ error: "Application incomplete", missing });
    return;
  }
  // ───────────────────────────────────────────────────────────────────────────

  const [updated] = await db
    .update(applicationsTable)
    .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(applicationsTable.id, applicationId),
        eq(applicationsTable.studentId, sid),
      ),
    )
    .returning();

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

export default router;
