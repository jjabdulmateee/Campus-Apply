import { Router } from "express";
import { db } from "@workspace/db";
import {
  applicationsTable,
  adminRemarksTable,
  studentProfilesTable,
  academicRecordsTable,
  testScoresTable,
  essaysTable,
  documentsTable,
  universitiesTable,
  programsTable,
} from "@workspace/db";
import { eq, desc, ilike, or, and, ne } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";
import { z } from "zod";

const router = Router();

router.use(requireAdmin);

// ── GET /admin/stats ──────────────────────────────────────────────────────
router.get("/stats", async (_req, res) => {
  const all = await db.select({ status: applicationsTable.status }).from(applicationsTable);
  const total = all.filter((a) => a.status !== "draft" && a.status !== "withdrawn").length;
  const pending = all.filter((a) => a.status === "submitted").length;
  const underReview = all.filter((a) => a.status === "under_review").length;
  const accepted = all.filter((a) => a.status === "accepted").length;
  const rejected = all.filter((a) => a.status === "rejected").length;
  res.json({ total, pending, underReview, accepted, rejected });
});

// ── GET /admin/applications ────────────────────────────────────────────────
router.get("/applications", async (req, res) => {
  const { search, universityId, status, sort } = req.query as Record<string, string>;

  const rows = await db
    .select({
      id: applicationsTable.id,
      studentId: applicationsTable.studentId,
      universityId: applicationsTable.universityId,
      programId: applicationsTable.programId,
      status: applicationsTable.status,
      submittedAt: applicationsTable.submittedAt,
      reviewedAt: applicationsTable.reviewedAt,
      updatedAt: applicationsTable.updatedAt,
      adminNotes: applicationsTable.adminNotes,
      decisionReason: applicationsTable.decisionReason,
      firstName: studentProfilesTable.firstName,
      lastName: studentProfilesTable.lastName,
      email: studentProfilesTable.email,
      province: studentProfilesTable.province,
      cnicNumber: studentProfilesTable.cnicNumber,
    })
    .from(applicationsTable)
    .leftJoin(studentProfilesTable, eq(applicationsTable.studentId, studentProfilesTable.studentId))
    .where(
      and(
        ne(applicationsTable.status, "draft"),
        ne(applicationsTable.status, "withdrawn"),
        universityId ? eq(applicationsTable.universityId, parseInt(universityId)) : undefined,
        status ? eq(applicationsTable.status, status as "submitted" | "under_review" | "accepted" | "rejected" | "waitlisted") : undefined,
        search
          ? or(
              ilike(studentProfilesTable.firstName, `%${search}%`),
              ilike(studentProfilesTable.lastName, `%${search}%`),
              ilike(studentProfilesTable.email, `%${search}%`),
              ilike(studentProfilesTable.cnicNumber, `%${search}%`),
            )
          : undefined,
      ),
    )
    .orderBy(desc(applicationsTable.submittedAt));

  // Enrich with university + program names from DB
  const uniIds = [...new Set(rows.map((r) => r.universityId))];
  const progIds = [...new Set(rows.map((r) => r.programId))];

  const unis = uniIds.length > 0
    ? await db.select({ id: universitiesTable.id, name: universitiesTable.name, shortName: universitiesTable.shortName })
        .from(universitiesTable)
    : [];
  const progs = progIds.length > 0
    ? await db.select({ id: programsTable.id, universityId: programsTable.universityId, name: programsTable.name })
        .from(programsTable)
    : [];

  // Pull test scores for aggregate calculation
  const studentIds = [...new Set(rows.map((r) => r.studentId))];
  const scoreMap: Record<string, number> = {};
  for (const sid of studentIds) {
    const scores = await db
      .select()
      .from(testScoresTable)
      .where(eq(testScoresTable.studentId, sid));
    const best = scores.reduce((acc, s) => {
      const pct = s.score && s.maxScore ? (parseFloat(s.score) / parseFloat(s.maxScore)) * 100 : 0;
      return Math.max(acc, pct);
    }, 0);
    scoreMap[sid] = Math.round(best);
  }

  let result = rows.map((r) => {
    const uni = unis.find((u) => u.id === r.universityId);
    const prog = progs.find((p) => p.id === r.programId && p.universityId === r.universityId);
    return {
      ...r,
      universityName: uni?.name ?? "Unknown",
      universityShortName: uni?.shortName ?? "UNI",
      programName: prog?.name ?? "Unknown Program",
      studentName: [r.firstName, r.lastName].filter(Boolean).join(" ") || "Unknown",
      aggregateScore: scoreMap[r.studentId] ?? 0,
    };
  });

  if (sort === "name") result.sort((a, b) => a.studentName.localeCompare(b.studentName));
  if (sort === "score") result.sort((a, b) => b.aggregateScore - a.aggregateScore);

  const total = result.length;
  const pending = result.filter((r) => r.status === "submitted" || r.status === "under_review").length;
  const decided = result.filter((r) => ["accepted", "rejected", "waitlisted"].includes(r.status)).length;

  res.json({ applications: result, stats: { total, pending, decided } });
});

// ── GET /admin/applications/:id ────────────────────────────────────────────
router.get("/applications/:id", async (req, res) => {
  const appId = parseInt(req.params.id);
  if (isNaN(appId)) return res.status(400).json({ error: "Invalid application ID" });

  const [app] = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.id, appId));

  if (!app) return res.status(404).json({ error: "Application not found" });

  const [profile] = await db
    .select()
    .from(studentProfilesTable)
    .where(eq(studentProfilesTable.studentId, app.studentId));

  const [uni] = await db.select().from(universitiesTable).where(eq(universitiesTable.id, app.universityId));
  const [prog] = await db.select().from(programsTable).where(eq(programsTable.id, app.programId));

  const academics = await db
    .select()
    .from(academicRecordsTable)
    .where(eq(academicRecordsTable.studentId, app.studentId));

  const tests = await db
    .select()
    .from(testScoresTable)
    .where(eq(testScoresTable.studentId, app.studentId));

  const essays = await db
    .select()
    .from(essaysTable)
    .where(eq(essaysTable.studentId, app.studentId));

  const documents = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.studentId, app.studentId));

  const remarks = await db
    .select()
    .from(adminRemarksTable)
    .where(eq(adminRemarksTable.applicationId, appId))
    .orderBy(desc(adminRemarksTable.createdAt));

  return res.json({
    application: {
      ...app,
      universityName: uni?.name ?? "Unknown",
      universityShortName: uni?.shortName ?? "UNI",
      programName: prog?.name ?? "Unknown Program",
    },
    profile: profile ?? null,
    academics,
    tests,
    essays,
    documents,
    remarks,
  });
});

// ── PUT /admin/applications/:id/decision ──────────────────────────────────
const DecisionBody = z.object({
  status: z.enum(["under_review", "accepted", "rejected", "waitlisted"]),
  decisionReason: z.string().optional(),
  adminNotes: z.string().optional(),
});

router.put("/applications/:id/decision", async (req, res) => {
  const appId = parseInt(req.params.id);
  if (isNaN(appId)) return res.status(400).json({ error: "Invalid application ID" });

  const body = DecisionBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.errors[0].message });
  }

  const [updated] = await db
    .update(applicationsTable)
    .set({
      status: body.data.status,
      decisionReason: body.data.decisionReason ?? null,
      adminNotes: body.data.adminNotes ?? null,
      reviewedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(applicationsTable.id, appId))
    .returning();

  if (!updated) return res.status(404).json({ error: "Application not found" });

  return res.json({ application: updated });
});

// ── GET /admin/applications/:id/remarks ───────────────────────────────────
router.get("/applications/:id/remarks", async (req, res) => {
  const appId = parseInt(req.params.id);
  if (isNaN(appId)) return res.status(400).json({ error: "Invalid application ID" });

  const remarks = await db
    .select()
    .from(adminRemarksTable)
    .where(eq(adminRemarksTable.applicationId, appId))
    .orderBy(desc(adminRemarksTable.createdAt));

  return res.json({ remarks });
});

// ── POST /admin/applications/:id/remarks ──────────────────────────────────
const RemarkBody = z.object({ remark: z.string().min(1) });

router.post("/applications/:id/remarks", async (req, res) => {
  const appId = parseInt(req.params.id);
  if (isNaN(appId)) return res.status(400).json({ error: "Invalid application ID" });

  const body = RemarkBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.errors[0].message });
  }

  const admin = req.user!;
  const [remark] = await db
    .insert(adminRemarksTable)
    .values({
      applicationId: appId,
      adminId: admin.userId,
      adminName: admin.fullName,
      remark: body.data.remark,
    })
    .returning();

  // Mark as under_review if still submitted
  await db
    .update(applicationsTable)
    .set({ status: "under_review", updatedAt: new Date() })
    .where(
      and(
        eq(applicationsTable.id, appId),
        eq(applicationsTable.status, "submitted"),
      ),
    );

  return res.status(201).json({ remark });
});

export default router;
