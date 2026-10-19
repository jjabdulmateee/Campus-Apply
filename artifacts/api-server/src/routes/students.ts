import { Router } from "express";
import { z } from "zod";
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
  userCollegesTable,
} from "@workspace/db";
import {
  ensureDraftApplication,
  validateApplication,
  submitApplication,
  SubmissionError,
} from "../lib/submission";
import { assertChangedPathsOwnedBy, UploadOwnershipError } from "../lib/uploadRegistry";
import { syncProfileDocumentsToLocker, upsertLockerDocument } from "../lib/documentLocker";
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
  SaveCollegeBody,
  UpdateCollegeStatusBody,
  RemoveCollegeParams,
  UpdateCollegeStatusParams,
} from "@workspace/api-zod";
import { eq, and, desc } from "drizzle-orm";
import { requireStudent, getStudentId } from "../middleware/auth";
import { assertApplicationSectionsEditable } from "../middleware/lockSubmitted";

const router = Router();
router.use(requireStudent);

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
  if (profile?.cnicDocumentUrl) pct += 5;
  if (profile?.transcriptUrl) pct += 5;
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
      isComplete: !!(
        profile?.motherName?.trim() &&
        profile?.motherOccupation?.trim() &&
        profile?.motherEducationLevel?.trim() &&
        profile?.householdIncomeTier?.trim() &&
        profile?.siblingCount !== null &&
        profile?.siblingCount !== undefined
      ),
      completionPercent: (() => {
        const fields = [
          profile?.motherName,
          profile?.motherOccupation,
          profile?.motherEducationLevel,
          profile?.householdIncomeTier,
          profile?.siblingCount !== null && profile?.siblingCount !== undefined
            ? String(profile.siblingCount)
            : null,
        ];
        const filled = fields.filter((f) => f && String(f).trim()).length;
        return Math.round((filled / fields.length) * 100);
      })(),
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
    {
      name: "Documents",
      slug: "documents",
      isComplete: !!(profile?.cnicDocumentUrl && profile?.transcriptUrl),
      completionPercent:
        ((profile?.cnicDocumentUrl ? 1 : 0) + (profile?.transcriptUrl ? 1 : 0)) * 50,
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

router.put("/me/profile", assertApplicationSectionsEditable, async (req, res) => {
  const sid = getStudentId(req);
  const body = UpdateMyProfileBody.parse(req.body);
  const existing = await db.query.studentProfilesTable.findFirst({
    where: eq(studentProfilesTable.studentId, sid),
  });

  // A student may only bind objects they uploaded themselves.
  try {
    await assertChangedPathsOwnedBy(
      req.user!.userId,
      {
        cnicDocumentUrl: body.cnicDocumentUrl,
        transcriptUrl: body.transcriptUrl,
        photoUrl: body.photoUrl,
      },
      {
        cnicDocumentUrl: existing?.cnicDocumentUrl,
        transcriptUrl: existing?.transcriptUrl,
        photoUrl: existing?.photoUrl,
      },
    );
  } catch (err) {
    if (err instanceof UploadOwnershipError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }

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

  await syncProfileDocumentsToLocker(sid);

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

router.post("/me/academics", assertApplicationSectionsEditable, async (req, res) => {
  const sid = getStudentId(req);
  const body = AddAcademicRecordBody.parse(req.body);
  const { percentage, ...rest } = body;

  try {
    await assertChangedPathsOwnedBy(
      req.user!.userId,
      { transcriptDocUrl: rest.transcriptDocUrl },
      {},
    );
  } catch (err) {
    if (err instanceof UploadOwnershipError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }

  const [record] = await db
    .insert(academicRecordsTable)
    .values({ ...rest, studentId: sid, percentage: percentage?.toString() ?? null })
    .returning();
  if (record.transcriptDocUrl) {
    await upsertLockerDocument({
      studentId: sid,
      category:
        record.level === "matric"
          ? "matric_marksheet"
          : record.level === "o_levels"
            ? "o_level_transcript"
            : record.level === "a_levels"
              ? "a_level_transcript"
              : "fsc_transcript",
      objectPath: record.transcriptDocUrl,
      fileName: `${record.institution} transcript`,
    });
  }
  res.status(201).json(record);
});

router.put("/me/academics/:recordId", assertApplicationSectionsEditable, async (req, res) => {
  const sid = getStudentId(req);
  const { recordId } = UpdateAcademicRecordParams.parse(req.params);
  const body = UpdateAcademicRecordBody.parse(req.body);
  const { percentage, ...rest } = body;

  const current = await db.query.academicRecordsTable.findFirst({
    where: and(
      eq(academicRecordsTable.id, recordId),
      eq(academicRecordsTable.studentId, sid),
    ),
    columns: { transcriptDocUrl: true },
  });
  if (!current) {
    res.status(404).json({ error: "Education record not found" });
    return;
  }

  try {
    await assertChangedPathsOwnedBy(
      req.user!.userId,
      { transcriptDocUrl: rest.transcriptDocUrl },
      { transcriptDocUrl: current.transcriptDocUrl },
    );
  } catch (err) {
    if (err instanceof UploadOwnershipError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }

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
  if (updated?.transcriptDocUrl) {
    await upsertLockerDocument({
      studentId: sid,
      category:
        updated.level === "matric"
          ? "matric_marksheet"
          : updated.level === "o_levels"
            ? "o_level_transcript"
            : updated.level === "a_levels"
              ? "a_level_transcript"
              : "fsc_transcript",
      objectPath: updated.transcriptDocUrl,
      fileName: `${updated.institution} transcript`,
    });
  }
  res.json(updated);
});

router.delete("/me/academics/:recordId", assertApplicationSectionsEditable, async (req, res) => {
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

router.post("/me/essays", assertApplicationSectionsEditable, async (req, res) => {
  const sid = getStudentId(req);
  const body = CreateEssayBody.parse(req.body);
  const [essay] = await db
    .insert(essaysTable)
    .values({ ...body, studentId: sid })
    .returning();
  res.status(201).json(essay);
});

router.put("/me/essays/:essayId", assertApplicationSectionsEditable, async (req, res) => {
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

router.delete("/me/essays/:essayId", assertApplicationSectionsEditable, async (req, res) => {
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

  // ── Deadlines: merge active applications + saved-college watchlist ──────────
  function calcDaysLeft(deadlineStr: string): number {
    if (!deadlineStr || deadlineStr === "TBD") return 999;
    const dl = new Date(deadlineStr);
    if (isNaN(dl.getTime())) return 999;
    return Math.max(0, Math.ceil((dl.getTime() - Date.now()) / 86400000));
  }

  const savedColleges = await db
    .select()
    .from(userCollegesTable)
    .where(eq(userCollegesTable.studentId, sid));

  const appDeadlineEntries = await Promise.all(
    apps
      .filter((a) => a.status !== "withdrawn" && a.status !== "rejected")
      .map(async (a) => {
        const [uni, prog] = await Promise.all([
          db.query.universitiesTable.findFirst({ where: eq(universitiesTable.id, a.universityId) }),
          db.query.programsTable.findFirst({ where: eq(programsTable.id, a.programId) }),
        ]);
        const deadlineStr = prog?.applicationDeadline ?? uni?.applicationDeadline ?? "TBD";
        return {
          universityId: a.universityId,
          universityName: uni?.shortName ?? uni?.name ?? "University",
          programName: prog?.name ?? "Program",
          deadline: deadlineStr,
          daysLeft: calcDaysLeft(deadlineStr),
        };
      }),
  );

  const watchlistDeadlineEntries = await Promise.all(
    savedColleges.map(async (c) => {
      const uni = await db.query.universitiesTable.findFirst({
        where: eq(universitiesTable.id, c.universityId),
      });
      const deadlineStr = uni?.applicationDeadline ?? "TBD";
      return {
        universityId: c.universityId,
        universityName: uni?.shortName ?? uni?.name ?? "University",
        programName: "Saved — not yet applied",
        deadline: deadlineStr,
        daysLeft: calcDaysLeft(deadlineStr),
      };
    }),
  );

  // Applications take priority; watchlist fills in only unseen universities
  const seenUniversityIds = new Set(appDeadlineEntries.map((e) => e.universityId));
  const uniqueWatchlist = watchlistDeadlineEntries.filter(
    (e) => !seenUniversityIds.has(e.universityId),
  );

  const upcomingDeadlines = [...appDeadlineEntries, ...uniqueWatchlist]
    .filter((e) => e.deadline !== "TBD")
    .sort((a, b) => a.daysLeft - b.daysLeft)
    .slice(0, 3)
    .map(({ universityName, programName, deadline, daysLeft }) => ({
      universityName,
      programName,
      deadline,
      daysLeft,
    }));
  // ───────────────────────────────────────────────────────────────────────────

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

// ─── My Colleges ─────────────────────────────────────────────────────────────

router.get("/me/colleges", async (req, res) => {
  const sid = getStudentId(req);
  const rows = await db
    .select()
    .from(userCollegesTable)
    .where(eq(userCollegesTable.studentId, sid));

  const withUniversity = await Promise.all(
    rows.map(async (c) => {
      const [uni] = await db
        .select()
        .from(universitiesTable)
        .where(eq(universitiesTable.id, c.universityId))
        .limit(1);
      return { ...c, university: uni ?? null };
    }),
  );

  res.json(withUniversity);
});

router.post("/me/colleges", async (req, res) => {
  const sid = getStudentId(req);
  const { universityId } = SaveCollegeBody.parse(req.body);

  const [existing] = await db
    .select()
    .from(userCollegesTable)
    .where(and(eq(userCollegesTable.studentId, sid), eq(userCollegesTable.universityId, universityId)))
    .limit(1);

  if (existing) {
    const [uni] = await db.select().from(universitiesTable).where(eq(universitiesTable.id, universityId)).limit(1);
    res.status(201).json({ ...existing, university: uni ?? null });
    return;
  }

  const [entry] = await db
    .insert(userCollegesTable)
    .values({ studentId: sid, universityId })
    .returning();

  const [uni] = await db.select().from(universitiesTable).where(eq(universitiesTable.id, universityId)).limit(1);
  res.status(201).json({ ...entry, university: uni ?? null });
});

router.delete("/me/colleges/:universityId", async (req, res) => {
  const sid = getStudentId(req);
  const { universityId } = RemoveCollegeParams.parse({ universityId: parseInt(req.params.universityId, 10) });

  await db
    .delete(userCollegesTable)
    .where(and(eq(userCollegesTable.studentId, sid), eq(userCollegesTable.universityId, universityId)));

  res.status(204).end();
});

router.patch("/me/colleges/:universityId", async (req, res) => {
  const sid = getStudentId(req);
  const { universityId } = UpdateCollegeStatusParams.parse({ universityId: parseInt(req.params.universityId, 10) });
  const { status } = UpdateCollegeStatusBody.parse(req.body);

  // "submitted" is reached only via POST /me/colleges/:universityId/submit,
  // which runs validation, snapshots the payload and syncs the application row.
  if (status === "submitted") {
    res.status(403).json({
      error: "Use the submit endpoint to submit an application",
    });
    return;
  }

  const [current] = await db
    .select({ status: userCollegesTable.status })
    .from(userCollegesTable)
    .where(and(eq(userCollegesTable.studentId, sid), eq(userCollegesTable.universityId, universityId)))
    .limit(1);

  if (!current) {
    res.status(404).json({ error: "College not in your list" });
    return;
  }
  if (current.status === "submitted") {
    res.status(409).json({ error: "A submitted application cannot be moved back to an earlier stage" });
    return;
  }

  const [updated] = await db
    .update(userCollegesTable)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(userCollegesTable.studentId, sid), eq(userCollegesTable.universityId, universityId)))
    .returning();

  const [uni] = await db.select().from(universitiesTable).where(eq(universitiesTable.id, universityId)).limit(1);
  res.json({ ...updated, university: uni ?? null });
});

// ─── College Submission: Validate + Submit ────────────────────────────────────

const SubmitCollegeParams = z.object({ universityId: z.coerce.number() });
const CollegeSubmitBodySchema = z.object({
  signature: z.string().min(2),
  programId: z.number().int().positive().optional(),
  paymentSimulated: z.boolean().optional(),
});

/**
 * Pre-flight for the "My Colleges" submit modal. Runs the same validator the
 * submit endpoint enforces. Ensures a draft application exists for the
 * university so the student has somewhere to answer program supplements —
 * the returned `applicationId` links to `/applications/:id/review`.
 */
router.get("/me/colleges/:universityId/validate", async (req, res) => {
  const sid = getStudentId(req);
  const { universityId } = SubmitCollegeParams.parse({ universityId: parseInt(req.params.universityId, 10) });
  const programIdRaw = req.query.programId;
  const programId =
    typeof programIdRaw === "string" && /^\d+$/.test(programIdRaw)
      ? parseInt(programIdRaw, 10)
      : undefined;

  try {
    const application = await ensureDraftApplication({ studentId: sid, universityId, programId });
    const { validation, packet } = await validateApplication(sid, application);
    const profile = packet.profile;

    const profileFields = [
      profile?.firstName, profile?.lastName, profile?.dateOfBirth,
      profile?.gender, profile?.phoneNumber, profile?.province, profile?.city,
    ];
    const profileCompletionPercent = Math.round(
      (profileFields.filter(Boolean).length / profileFields.length) * 100,
    );

    res.json({
      canSubmit: validation.canSubmit && application.status === "draft",
      missing:
        application.status === "draft"
          ? validation.missing
          : [`This application has already been ${application.status}`],
      profileCompletionPercent,
      profile,
      tests: packet.tests.map((t) => ({ id: t.id, testName: t.testName, score: t.score, maxScore: t.maxScore, testDate: t.testDate, notes: t.notes })),
      essays: packet.essays.map((e) => ({
        id: e.id,
        type: e.type,
        prompt: e.prompt,
        content: e.content,
        wordCount: e.wordCount,
      })),
      applicationId: application.id,
      programId: application.programId,
      applicationStatus: application.status,
    });
  } catch (err) {
    if (err instanceof SubmissionError) {
      res.status(err.httpStatus).json({ error: err.message, missing: err.missing });
      return;
    }
    throw err;
  }
});

/**
 * Canonical "My Colleges" submission. Resolves (or creates) the student's
 * program-specific application and submits THAT record, so the watchlist and
 * the admin admissions queue share a single source of truth.
 */
router.post("/me/colleges/:universityId/submit", async (req, res) => {
  const sid = getStudentId(req);
  const { universityId } = SubmitCollegeParams.parse({ universityId: parseInt(req.params.universityId, 10) });
  const { signature, programId, paymentSimulated } = CollegeSubmitBodySchema.parse(req.body);

  const [college] = await db
    .select()
    .from(userCollegesTable)
    .where(and(eq(userCollegesTable.studentId, sid), eq(userCollegesTable.universityId, universityId)))
    .limit(1);

  if (!college) { res.status(404).json({ error: "College not in your list" }); return; }
  if (college.status === "submitted") { res.status(409).json({ error: "Already submitted" }); return; }

  try {
    const application = await ensureDraftApplication({ studentId: sid, universityId, programId });
    const result = await submitApplication({
      studentId: sid,
      application,
      signature,
      paymentSimulated,
    });

    const [updated] = await db
      .select()
      .from(userCollegesTable)
      .where(and(eq(userCollegesTable.studentId, sid), eq(userCollegesTable.universityId, universityId)))
      .limit(1);

    const [uni] = await db
      .select()
      .from(universitiesTable)
      .where(eq(universitiesTable.id, universityId))
      .limit(1);

    res.json({
      ...(updated ?? college),
      applicationId: result.application.id,
      programId: result.application.programId,
      university: uni ?? null,
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
