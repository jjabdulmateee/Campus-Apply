import { Router } from "express";
import { db } from "@workspace/db";
import {
  studentProfilesTable,
  academicRecordsTable,
  testScoresTable,
  activitiesTable,
  essaysTable,
  applicationsTable,
  universitiesTable,
  programsTable,
} from "@workspace/db";
import {
  UpdateMyProfileBody,
  AddAcademicRecordBody,
  UpdateAcademicRecordBody,
  UpdateAcademicRecordParams,
  DeleteAcademicRecordParams,
  AddTestScoreBody,
  UpdateTestScoreBody,
  UpdateTestScoreParams,
  DeleteTestScoreParams,
  AddActivityBody,
  UpdateActivityBody,
  UpdateActivityParams,
  DeleteActivityParams,
  CreateEssayBody,
  UpdateEssayBody,
  UpdateEssayParams,
  DeleteEssayParams,
} from "@workspace/api-zod";
import { eq, and, desc } from "drizzle-orm";
import { optionalJWT, getStudentId } from "../middleware/auth";

const router = Router();
router.use(optionalJWT);

// ─── Shared completion helpers ─────────────────────────────────────────────────

type ProfileRow = typeof studentProfilesTable.$inferSelect;

function computeCompletion(
  profile: ProfileRow | undefined,
  academicCount: number,
  testCount: number,
  activityCount: number,
  essayWordCount: number,
): number {
  let pct = 0;
  if (profile?.firstName) pct += 8;
  if (profile?.email) pct += 4;
  if (profile?.dateOfBirth) pct += 6;
  if (profile?.cnicNumber) pct += 6;
  if (profile?.province) pct += 6;
  if (profile?.city) pct += 5;
  if (profile?.phoneNumber) pct += 5;
  if (profile?.fatherName) pct += 5;
  if (academicCount >= 1) pct += 10;
  if (academicCount >= 2) pct += 10;
  if (testCount >= 1) pct += 15;
  if (activityCount >= 1) pct += 5;
  if (activityCount >= 3) pct += 5;
  if (essayWordCount >= 50) pct += 5;
  if (essayWordCount >= 300) pct += 5;
  return Math.min(pct, 100);
}

function computeSections(
  profile: ProfileRow | undefined,
  academics: { level: string }[],
  tests: unknown[],
  activities: unknown[],
  essays: { content: string | null }[],
) {
  const profileFieldsFilled = [
    profile?.firstName,
    profile?.email,
    profile?.dateOfBirth,
    profile?.cnicNumber,
    profile?.province,
    profile?.city,
    profile?.phoneNumber,
  ].filter(Boolean).length;
  const profilePct = Math.round((profileFieldsFilled / 7) * 100);

  const hasMatricOrO = academics.some(
    (a) => a.level === "matric" || a.level === "o_levels",
  );
  const hasFscOrA = academics.some(
    (a) => a.level === "intermediate" || a.level === "a_levels",
  );
  const educationPct = (hasMatricOrO ? 50 : 0) + (hasFscOrA ? 50 : 0);

  const totalEssayWords = essays.reduce((sum, e) => {
    return (
      sum +
      (e.content ? e.content.trim().split(/\s+/).filter(Boolean).length : 0)
    );
  }, 0);
  const personalStatement = essays.find(
    (e) => (e as { type?: string }).type === "personal_statement",
  );
  const psWords = personalStatement?.content
    ? personalStatement.content.trim().split(/\s+/).filter(Boolean).length
    : 0;

  return [
    {
      name: "Profile",
      slug: "profile",
      isComplete: profileFieldsFilled >= 6,
      completionPercent: profilePct,
    },
    {
      name: "Family",
      slug: "family",
      isComplete: !!profile?.fatherName,
      completionPercent: profile?.fatherName ? 100 : 0,
    },
    {
      name: "Education",
      slug: "education",
      isComplete: educationPct === 100,
      completionPercent: educationPct,
    },
    {
      name: "Testing",
      slug: "testing",
      isComplete: tests.length >= 1,
      completionPercent: tests.length > 0 ? 100 : 0,
    },
    {
      name: "Activities",
      slug: "activities",
      isComplete: activities.length >= 3,
      completionPercent: Math.min(
        Math.round((activities.length / 3) * 100),
        100,
      ),
    },
    {
      name: "Writing",
      slug: "writing",
      isComplete: psWords >= 300,
      completionPercent:
        psWords >= 300
          ? 100
          : psWords >= 50
            ? 50
            : totalEssayWords > 0
              ? 25
              : 0,
    },
    {
      name: "Courses",
      slug: "courses",
      isComplete: academics.length >= 1,
      completionPercent: academics.length > 0 ? 100 : 0,
    },
  ];
}

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get("/me/profile", async (req, res) => {
  const sid = getStudentId(req);
  const profile = await db.query.studentProfilesTable.findFirst({
    where: eq(studentProfilesTable.studentId, sid),
  });
  if (!profile) {
    res.status(404).json({ error: "Profile not found" });
    return;
  }

  const [academics, tests, activities, essays] = await Promise.all([
    db.select().from(academicRecordsTable).where(eq(academicRecordsTable.studentId, sid)),
    db.select().from(testScoresTable).where(eq(testScoresTable.studentId, sid)),
    db.select().from(activitiesTable).where(eq(activitiesTable.studentId, sid)),
    db.select().from(essaysTable).where(eq(essaysTable.studentId, sid)),
  ]);

  const essayWords = essays.reduce(
    (s, e) =>
      s + (e.content ? e.content.trim().split(/\s+/).filter(Boolean).length : 0),
    0,
  );
  const completion = computeCompletion(
    profile,
    academics.length,
    tests.length,
    activities.length,
    essayWords,
  );

  res.json({ ...profile, profileCompletionPercent: completion });
});

router.put("/me/profile", async (req, res) => {
  const sid = getStudentId(req);
  const body = UpdateMyProfileBody.parse(req.body);
  const existing = await db.query.studentProfilesTable.findFirst({
    where: eq(studentProfilesTable.studentId, sid),
  });

  let profile: ProfileRow;
  if (existing) {
    const [updated] = await db
      .update(studentProfilesTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(studentProfilesTable.studentId, sid))
      .returning();
    profile = updated;
  } else {
    const [created] = await db
      .insert(studentProfilesTable)
      .values({ ...body, studentId: sid })
      .returning();
    profile = created;
  }

  const [academics, tests, activities, essays] = await Promise.all([
    db.select().from(academicRecordsTable).where(eq(academicRecordsTable.studentId, sid)),
    db.select().from(testScoresTable).where(eq(testScoresTable.studentId, sid)),
    db.select().from(activitiesTable).where(eq(activitiesTable.studentId, sid)),
    db.select().from(essaysTable).where(eq(essaysTable.studentId, sid)),
  ]);

  const essayWords = essays.reduce(
    (s, e) =>
      s + (e.content ? e.content.trim().split(/\s+/).filter(Boolean).length : 0),
    0,
  );
  const completion = computeCompletion(
    profile,
    academics.length,
    tests.length,
    activities.length,
    essayWords,
  );

  res.json({ ...profile, profileCompletionPercent: completion });
});

// ─── Academics ───────────────────────────────────────────────────────────────
router.get("/me/academics", async (req, res) => {
  const sid = getStudentId(req);
  const records = await db
    .select()
    .from(academicRecordsTable)
    .where(eq(academicRecordsTable.studentId, sid))
    .orderBy(desc(academicRecordsTable.passingYear));
  res.json(records);
});

router.post("/me/academics", async (req, res) => {
  const sid = getStudentId(req);
  const body = AddAcademicRecordBody.parse(req.body);
  const { percentage, ...rest } = body;
  const [record] = await db
    .insert(academicRecordsTable)
    .values({ ...rest, studentId: sid, percentage: percentage?.toString() ?? null })
    .returning();
  res.status(201).json(record);
});

router.put("/me/academics/:recordId", async (req, res) => {
  const sid = getStudentId(req);
  const { recordId } = UpdateAcademicRecordParams.parse(req.params);
  const body = UpdateAcademicRecordBody.parse(req.body);
  const { percentage, ...rest } = body;
  const [updated] = await db
    .update(academicRecordsTable)
    .set({ ...rest, percentage: percentage?.toString() ?? null })
    .where(
      and(
        eq(academicRecordsTable.id, recordId),
        eq(academicRecordsTable.studentId, sid),
      ),
    )
    .returning();
  res.json(updated);
});

router.delete("/me/academics/:recordId", async (req, res) => {
  const sid = getStudentId(req);
  const { recordId } = DeleteAcademicRecordParams.parse(req.params);
  await db
    .delete(academicRecordsTable)
    .where(
      and(
        eq(academicRecordsTable.id, recordId),
        eq(academicRecordsTable.studentId, sid),
      ),
    );
  res.status(204).send();
});

// ─── Test Scores ──────────────────────────────────────────────────────────────
router.get("/me/test-scores", async (req, res) => {
  const sid = getStudentId(req);
  const scores = await db
    .select()
    .from(testScoresTable)
    .where(eq(testScoresTable.studentId, sid));
  res.json(scores);
});

router.post("/me/test-scores", async (req, res) => {
  const sid = getStudentId(req);
  const body = AddTestScoreBody.parse(req.body);
  const [score] = await db
    .insert(testScoresTable)
    .values({ ...body, studentId: sid })
    .returning();
  res.status(201).json(score);
});

router.put("/me/test-scores/:scoreId", async (req, res) => {
  const sid = getStudentId(req);
  const { scoreId } = UpdateTestScoreParams.parse(req.params);
  const body = UpdateTestScoreBody.parse(req.body);
  const [updated] = await db
    .update(testScoresTable)
    .set(body)
    .where(
      and(
        eq(testScoresTable.id, scoreId),
        eq(testScoresTable.studentId, sid),
      ),
    )
    .returning();
  res.json(updated);
});

router.delete("/me/test-scores/:scoreId", async (req, res) => {
  const sid = getStudentId(req);
  const { scoreId } = DeleteTestScoreParams.parse(req.params);
  await db
    .delete(testScoresTable)
    .where(
      and(
        eq(testScoresTable.id, scoreId),
        eq(testScoresTable.studentId, sid),
      ),
    );
  res.status(204).send();
});

// ─── Activities ───────────────────────────────────────────────────────────────
router.get("/me/activities", async (req, res) => {
  const sid = getStudentId(req);
  const acts = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.studentId, sid));
  res.json(acts);
});

router.post("/me/activities", async (req, res) => {
  const sid = getStudentId(req);
  const body = AddActivityBody.parse(req.body);
  const [act] = await db
    .insert(activitiesTable)
    .values({ ...body, studentId: sid })
    .returning();
  res.status(201).json(act);
});

router.put("/me/activities/:activityId", async (req, res) => {
  const sid = getStudentId(req);
  const { activityId } = UpdateActivityParams.parse(req.params);
  const body = UpdateActivityBody.parse(req.body);
  const [updated] = await db
    .update(activitiesTable)
    .set(body)
    .where(
      and(
        eq(activitiesTable.id, activityId),
        eq(activitiesTable.studentId, sid),
      ),
    )
    .returning();
  res.json(updated);
});

router.delete("/me/activities/:activityId", async (req, res) => {
  const sid = getStudentId(req);
  const { activityId } = DeleteActivityParams.parse(req.params);
  await db
    .delete(activitiesTable)
    .where(
      and(
        eq(activitiesTable.id, activityId),
        eq(activitiesTable.studentId, sid),
      ),
    );
  res.status(204).send();
});

// ─── Essays ───────────────────────────────────────────────────────────────────
router.get("/me/essays", async (req, res) => {
  const sid = getStudentId(req);
  const essays = await db
    .select()
    .from(essaysTable)
    .where(eq(essaysTable.studentId, sid));
  const withWordCount = essays.map((e) => ({
    ...e,
    wordCount: e.content
      ? e.content.trim().split(/\s+/).filter(Boolean).length
      : 0,
  }));
  res.json(withWordCount);
});

router.post("/me/essays", async (req, res) => {
  const sid = getStudentId(req);
  const body = CreateEssayBody.parse(req.body);
  const [essay] = await db
    .insert(essaysTable)
    .values({ ...body, studentId: sid })
    .returning();
  res.status(201).json(essay);
});

router.put("/me/essays/:essayId", async (req, res) => {
  const sid = getStudentId(req);
  const { essayId } = UpdateEssayParams.parse(req.params);
  const body = UpdateEssayBody.parse(req.body);
  const [updated] = await db
    .update(essaysTable)
    .set({ ...body, updatedAt: new Date() })
    .where(
      and(eq(essaysTable.id, essayId), eq(essaysTable.studentId, sid)),
    )
    .returning();
  res.json(updated);
});

router.delete("/me/essays/:essayId", async (req, res) => {
  const sid = getStudentId(req);
  const { essayId } = DeleteEssayParams.parse(req.params);
  await db
    .delete(essaysTable)
    .where(
      and(eq(essaysTable.id, essayId), eq(essaysTable.studentId, sid)),
    );
  res.status(204).send();
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/me/dashboard", async (req, res) => {
  const sid = getStudentId(req);
  const [profile, academics, tests, acts, essays, apps] = await Promise.all([
    db.query.studentProfilesTable.findFirst({
      where: eq(studentProfilesTable.studentId, sid),
    }),
    db.select().from(academicRecordsTable).where(eq(academicRecordsTable.studentId, sid)),
    db.select().from(testScoresTable).where(eq(testScoresTable.studentId, sid)),
    db.select().from(activitiesTable).where(eq(activitiesTable.studentId, sid)),
    db.select().from(essaysTable).where(eq(essaysTable.studentId, sid)),
    db.select().from(applicationsTable).where(eq(applicationsTable.studentId, sid)),
  ]);

  const essayWords = essays.reduce(
    (s, e) =>
      s + (e.content ? e.content.trim().split(/\s+/).filter(Boolean).length : 0),
    0,
  );
  const completion = computeCompletion(
    profile,
    academics.length,
    tests.length,
    acts.length,
    essayWords,
  );
  const sections = computeSections(profile, academics, tests, acts, essays);

  const upcomingDeadlines = await Promise.all(
    apps
      .filter((a) => a.status !== "withdrawn" && a.status !== "rejected")
      .slice(0, 3)
      .map(async (a) => {
        const [uni, prog] = await Promise.all([
          db.query.universitiesTable.findFirst({
            where: eq(universitiesTable.id, a.universityId),
          }),
          db.query.programsTable.findFirst({
            where: eq(programsTable.id, a.programId),
          }),
        ]);
        const deadlineStr =
          prog?.applicationDeadline ?? uni?.applicationDeadline ?? "TBD";
        let daysLeft = 30;
        if (deadlineStr && deadlineStr !== "TBD") {
          const dl = new Date(deadlineStr);
          if (!isNaN(dl.getTime())) {
            daysLeft = Math.max(
              0,
              Math.ceil((dl.getTime() - Date.now()) / 86400000),
            );
          }
        }
        return {
          universityName: uni?.shortName ?? uni?.name ?? "University",
          programName: prog?.name ?? "Program",
          deadline: deadlineStr,
          daysLeft,
        };
      }),
  );

  const recentActivity = [
    ...(profile
      ? [
          {
            action: "Profile updated",
            detail: `${profile.firstName} ${profile.lastName}`,
            timestamp:
              profile.updatedAt?.toISOString() ?? new Date().toISOString(),
          },
        ]
      : []),
    ...academics.slice(0, 2).map((a) => ({
      action: "Education added",
      detail: `${a.institution} — ${a.level}`,
      timestamp: a.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
    ...tests.slice(0, 1).map((t) => ({
      action: "Test score added",
      detail: `${t.testName}: ${t.score}`,
      timestamp: t.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
    ...acts.slice(0, 1).map((a) => ({
      action: "Activity added",
      detail: a.name,
      timestamp: a.createdAt?.toISOString() ?? new Date().toISOString(),
    })),
    ...apps.slice(0, 2).map((a) => ({
      action: "Application started",
      detail: `University ID ${a.universityId}`,
      timestamp: a.appliedAt?.toISOString() ?? new Date().toISOString(),
    })),
  ].slice(0, 5);

  res.json({
    profileCompletionPercent: completion,
    applicationCount: apps.length,
    submittedCount: apps.filter((a) => a.status === "submitted").length,
    pendingCount: apps.filter((a) => a.status === "draft").length,
    acceptedCount: apps.filter((a) => a.status === "accepted").length,
    upcomingDeadlines,
    recentActivity,
    profileSections: sections,
  });
});

export default router;
