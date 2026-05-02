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

const router = Router();

const DEMO_STUDENT_ID = "demo-student-001";

// ─── Profile ──────────────────────────────────────────────────────────────────
router.get("/me/profile", async (req, res) => {
  const profile = await db.query.studentProfilesTable.findFirst({
    where: eq(studentProfilesTable.studentId, DEMO_STUDENT_ID),
  });

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  const academicCount = await db
    .select()
    .from(academicRecordsTable)
    .where(eq(academicRecordsTable.studentId, DEMO_STUDENT_ID));
  const testCount = await db
    .select()
    .from(testScoresTable)
    .where(eq(testScoresTable.studentId, DEMO_STUDENT_ID));
  const activityCount = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.studentId, DEMO_STUDENT_ID));
  const essayCount = await db
    .select()
    .from(essaysTable)
    .where(eq(essaysTable.studentId, DEMO_STUDENT_ID));

  let completion = 0;
  if (profile.firstName) completion += 15;
  if (profile.fatherName) completion += 5;
  if (profile.dateOfBirth) completion += 5;
  if (profile.cnicNumber) completion += 5;
  if (profile.province) completion += 5;
  if (profile.city) completion += 5;
  if (profile.phoneNumber) completion += 5;
  if (academicCount.length > 0) completion += 20;
  if (testCount.length > 0) completion += 15;
  if (activityCount.length > 0) completion += 10;
  if (essayCount.length > 0) completion += 10;

  res.json({ ...profile, profileCompletionPercent: Math.min(completion, 100) });
});

router.put("/me/profile", async (req, res) => {
  const body = UpdateMyProfileBody.parse(req.body);
  const existing = await db.query.studentProfilesTable.findFirst({
    where: eq(studentProfilesTable.studentId, DEMO_STUDENT_ID),
  });

  if (existing) {
    const [updated] = await db
      .update(studentProfilesTable)
      .set({ ...body, updatedAt: new Date() })
      .where(eq(studentProfilesTable.studentId, DEMO_STUDENT_ID))
      .returning();
    return res.json({ ...updated, profileCompletionPercent: 60 });
  }

  const [created] = await db
    .insert(studentProfilesTable)
    .values({ ...body, studentId: DEMO_STUDENT_ID })
    .returning();
  res.json({ ...created, profileCompletionPercent: 20 });
});

// ─── Academics ───────────────────────────────────────────────────────────────
router.get("/me/academics", async (req, res) => {
  const records = await db
    .select()
    .from(academicRecordsTable)
    .where(eq(academicRecordsTable.studentId, DEMO_STUDENT_ID))
    .orderBy(desc(academicRecordsTable.passingYear));
  res.json(records);
});

router.post("/me/academics", async (req, res) => {
  const body = AddAcademicRecordBody.parse(req.body);
  const [record] = await db
    .insert(academicRecordsTable)
    .values({ ...body, studentId: DEMO_STUDENT_ID })
    .returning();
  res.status(201).json(record);
});

router.put("/me/academics/:recordId", async (req, res) => {
  const { recordId } = UpdateAcademicRecordParams.parse(req.params);
  const body = UpdateAcademicRecordBody.parse(req.body);
  const [updated] = await db
    .update(academicRecordsTable)
    .set(body)
    .where(
      and(
        eq(academicRecordsTable.id, recordId),
        eq(academicRecordsTable.studentId, DEMO_STUDENT_ID)
      )
    )
    .returning();
  res.json(updated);
});

router.delete("/me/academics/:recordId", async (req, res) => {
  const { recordId } = DeleteAcademicRecordParams.parse(req.params);
  await db
    .delete(academicRecordsTable)
    .where(
      and(
        eq(academicRecordsTable.id, recordId),
        eq(academicRecordsTable.studentId, DEMO_STUDENT_ID)
      )
    );
  res.status(204).send();
});

// ─── Test Scores ──────────────────────────────────────────────────────────────
router.get("/me/test-scores", async (req, res) => {
  const scores = await db
    .select()
    .from(testScoresTable)
    .where(eq(testScoresTable.studentId, DEMO_STUDENT_ID));
  res.json(scores);
});

router.post("/me/test-scores", async (req, res) => {
  const body = AddTestScoreBody.parse(req.body);
  const [score] = await db
    .insert(testScoresTable)
    .values({ ...body, studentId: DEMO_STUDENT_ID })
    .returning();
  res.status(201).json(score);
});

router.put("/me/test-scores/:scoreId", async (req, res) => {
  const { scoreId } = UpdateTestScoreParams.parse(req.params);
  const body = UpdateTestScoreBody.parse(req.body);
  const [updated] = await db
    .update(testScoresTable)
    .set(body)
    .where(
      and(eq(testScoresTable.id, scoreId), eq(testScoresTable.studentId, DEMO_STUDENT_ID))
    )
    .returning();
  res.json(updated);
});

router.delete("/me/test-scores/:scoreId", async (req, res) => {
  const { scoreId } = DeleteTestScoreParams.parse(req.params);
  await db
    .delete(testScoresTable)
    .where(
      and(eq(testScoresTable.id, scoreId), eq(testScoresTable.studentId, DEMO_STUDENT_ID))
    );
  res.status(204).send();
});

// ─── Activities ───────────────────────────────────────────────────────────────
router.get("/me/activities", async (req, res) => {
  const acts = await db
    .select()
    .from(activitiesTable)
    .where(eq(activitiesTable.studentId, DEMO_STUDENT_ID));
  res.json(acts);
});

router.post("/me/activities", async (req, res) => {
  const body = AddActivityBody.parse(req.body);
  const [act] = await db
    .insert(activitiesTable)
    .values({ ...body, studentId: DEMO_STUDENT_ID })
    .returning();
  res.status(201).json(act);
});

router.put("/me/activities/:activityId", async (req, res) => {
  const { activityId } = UpdateActivityParams.parse(req.params);
  const body = UpdateActivityBody.parse(req.body);
  const [updated] = await db
    .update(activitiesTable)
    .set(body)
    .where(
      and(eq(activitiesTable.id, activityId), eq(activitiesTable.studentId, DEMO_STUDENT_ID))
    )
    .returning();
  res.json(updated);
});

router.delete("/me/activities/:activityId", async (req, res) => {
  const { activityId } = DeleteActivityParams.parse(req.params);
  await db
    .delete(activitiesTable)
    .where(
      and(eq(activitiesTable.id, activityId), eq(activitiesTable.studentId, DEMO_STUDENT_ID))
    );
  res.status(204).send();
});

// ─── Essays ───────────────────────────────────────────────────────────────────
router.get("/me/essays", async (req, res) => {
  const essays = await db
    .select()
    .from(essaysTable)
    .where(eq(essaysTable.studentId, DEMO_STUDENT_ID));
  const withWordCount = essays.map((e) => ({
    ...e,
    wordCount: e.content ? e.content.trim().split(/\s+/).filter(Boolean).length : 0,
  }));
  res.json(withWordCount);
});

router.post("/me/essays", async (req, res) => {
  const body = CreateEssayBody.parse(req.body);
  const [essay] = await db
    .insert(essaysTable)
    .values({ ...body, studentId: DEMO_STUDENT_ID })
    .returning();
  res.status(201).json(essay);
});

router.put("/me/essays/:essayId", async (req, res) => {
  const { essayId } = UpdateEssayParams.parse(req.params);
  const body = UpdateEssayBody.parse(req.body);
  const [updated] = await db
    .update(essaysTable)
    .set({ ...body, updatedAt: new Date() })
    .where(
      and(eq(essaysTable.id, essayId), eq(essaysTable.studentId, DEMO_STUDENT_ID))
    )
    .returning();
  res.json(updated);
});

router.delete("/me/essays/:essayId", async (req, res) => {
  const { essayId } = DeleteEssayParams.parse(req.params);
  await db
    .delete(essaysTable)
    .where(
      and(eq(essaysTable.id, essayId), eq(essaysTable.studentId, DEMO_STUDENT_ID))
    );
  res.status(204).send();
});

// ─── Dashboard ────────────────────────────────────────────────────────────────
router.get("/me/dashboard", async (req, res) => {
  const profile = await db.query.studentProfilesTable.findFirst({
    where: eq(studentProfilesTable.studentId, DEMO_STUDENT_ID),
  });

  const academics = await db.select().from(academicRecordsTable).where(eq(academicRecordsTable.studentId, DEMO_STUDENT_ID));
  const tests = await db.select().from(testScoresTable).where(eq(testScoresTable.studentId, DEMO_STUDENT_ID));
  const acts = await db.select().from(activitiesTable).where(eq(activitiesTable.studentId, DEMO_STUDENT_ID));
  const essays = await db.select().from(essaysTable).where(eq(essaysTable.studentId, DEMO_STUDENT_ID));
  const apps = await db.select().from(applicationsTable).where(eq(applicationsTable.studentId, DEMO_STUDENT_ID));

  // Profile completion
  let completion = 0;
  if (profile?.firstName) completion += 15;
  if (profile?.fatherName) completion += 5;
  if (profile?.dateOfBirth) completion += 5;
  if (profile?.cnicNumber) completion += 5;
  if (profile?.province) completion += 5;
  if (profile?.city) completion += 5;
  if (profile?.phoneNumber) completion += 5;
  if (academics.length > 0) completion += 20;
  if (tests.length > 0) completion += 15;
  if (acts.length > 0) completion += 10;
  if (essays.length > 0) completion += 10;

  const sections = [
    { name: "Profile", slug: "profile", isComplete: !!(profile?.firstName && profile?.dateOfBirth && profile?.cnicNumber), completionPercent: profile ? 60 : 0 },
    { name: "Family", slug: "family", isComplete: !!(profile?.fatherName), completionPercent: profile?.fatherName ? 100 : 0 },
    { name: "Education", slug: "education", isComplete: academics.length >= 2, completionPercent: Math.min(academics.length * 50, 100) },
    { name: "Testing", slug: "testing", isComplete: tests.length >= 1, completionPercent: tests.length > 0 ? 100 : 0 },
    { name: "Activities", slug: "activities", isComplete: acts.length >= 1, completionPercent: Math.min(acts.length * 25, 100) },
    { name: "Writing", slug: "writing", isComplete: essays.some((e) => (e.content?.split(/\s+/).filter(Boolean).length ?? 0) > 50), completionPercent: essays.length > 0 ? 50 : 0 },
    { name: "Courses", slug: "courses", isComplete: academics.length >= 1, completionPercent: academics.length > 0 ? 100 : 0 },
  ];

  // Upcoming deadlines from apps
  const upcomingDeadlines = await Promise.all(
    apps
      .filter((a) => a.status !== "withdrawn" && a.status !== "rejected")
      .slice(0, 3)
      .map(async (a) => {
        const uni = await db.query.universitiesTable.findFirst({ where: eq(universitiesTable.id, a.universityId) });
        const prog = await db.query.programsTable.findFirst({ where: eq(programsTable.id, a.programId) });
        const deadline = prog?.applicationDeadline ?? uni?.applicationDeadline ?? "TBD";
        return {
          universityName: uni?.name ?? "University",
          programName: prog?.name ?? "Program",
          deadline,
          daysLeft: 30,
        };
      })
  );

  const recentActivity = [
    ...(profile ? [{ action: "Profile updated", detail: `${profile.firstName} ${profile.lastName}`, timestamp: profile.updatedAt?.toISOString() ?? new Date().toISOString() }] : []),
    ...academics.slice(0, 2).map((a) => ({ action: "Education added", detail: `${a.institution} — ${a.level}`, timestamp: a.createdAt?.toISOString() ?? new Date().toISOString() })),
    ...apps.slice(0, 2).map((a) => ({ action: "Application started", detail: `University ID ${a.universityId}`, timestamp: a.appliedAt?.toISOString() ?? new Date().toISOString() })),
  ].slice(0, 5);

  res.json({
    profileCompletionPercent: Math.min(completion, 100),
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
