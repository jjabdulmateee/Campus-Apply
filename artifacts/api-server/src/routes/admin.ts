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
  supportTicketsTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, desc, ilike, or, and, ne } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth";
import { getAdminUniversityScope, assertAdminApplicationAccess } from "../lib/adminScope";
import { sendApplicationDecisionEmail } from "../utils/email";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";

const router = Router();

router.use(requireAdmin);

// ── GET /admin/stats ──────────────────────────────────────────────────────
router.get("/stats", async (req, res) => {
  const scope = await getAdminUniversityScope(req.user!.userId);
  const all = await db
    .select({ status: applicationsTable.status, universityId: applicationsTable.universityId })
    .from(applicationsTable);
  const scoped = scope !== undefined ? all.filter((a) => a.universityId === scope) : all;
  const total = scoped.filter((a) => a.status !== "draft" && a.status !== "withdrawn").length;
  const pending = scoped.filter((a) => a.status === "submitted").length;
  const underReview = scoped.filter((a) => a.status === "under_review").length;
  const accepted = scoped.filter((a) => a.status === "accepted").length;
  const rejected = scoped.filter((a) => a.status === "rejected").length;
  res.json({ total, pending, underReview, accepted, rejected });
});

// ── GET /admin/applications ────────────────────────────────────────────────
router.get("/applications", async (req, res) => {
  const { search, universityId, status, sort } = req.query as Record<string, string>;
  const scope = await getAdminUniversityScope(req.user!.userId);
  const effectiveUniversityId =
    scope ?? (universityId ? parseInt(universityId, 10) : undefined);

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
        effectiveUniversityId !== undefined
          ? eq(applicationsTable.universityId, effectiveUniversityId)
          : undefined,
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

  // Pull FSc percentages for export metrics
  const fscMap: Record<string, string> = {};
  for (const sid of studentIds) {
    const records = await db
      .select()
      .from(academicRecordsTable)
      .where(
        and(
          eq(academicRecordsTable.studentId, sid),
          eq(academicRecordsTable.level, "intermediate"),
        ),
      );
    const best = records.sort((a, b) => b.passingYear - a.passingYear)[0];
    if (!best) {
      fscMap[sid] = "";
      continue;
    }
    if (best.percentage != null) {
      fscMap[sid] = String(Number(best.percentage));
    } else if (best.fscPart1Marks != null && best.fscPart2Marks != null) {
      fscMap[sid] = (((best.fscPart1Marks + best.fscPart2Marks) / 1100) * 100).toFixed(2);
    } else if (best.obtainedMarks != null && best.totalMarks) {
      fscMap[sid] = ((best.obtainedMarks / best.totalMarks) * 100).toFixed(2);
    } else {
      fscMap[sid] = "";
    }
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
      fscPercentage: fscMap[r.studentId] ?? "",
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

  if (!(await assertAdminApplicationAccess(req, res, app.universityId))) return;

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

  const [existing] = await db
    .select({ universityId: applicationsTable.universityId })
    .from(applicationsTable)
    .where(eq(applicationsTable.id, appId))
    .limit(1);
  if (!existing) return res.status(404).json({ error: "Application not found" });
  if (!(await assertAdminApplicationAccess(req, res, existing.universityId))) return;

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

  // ── Insert notification for the student ────────────────────────────────
  try {
    const [uni] = await db.select({ name: universitiesTable.name })
      .from(universitiesTable)
      .where(eq(universitiesTable.id, updated.universityId));
    const [prog] = await db.select({ name: programsTable.name })
      .from(programsTable)
      .where(eq(programsTable.id, updated.programId));
    const [user] = await db.select({ id: usersTable.id, email: usersTable.email, fullName: usersTable.fullName })
      .from(usersTable)
      .where(eq(usersTable.studentId, updated.studentId));

    const [studentProfile] = await db
      .select({ firstName: studentProfilesTable.firstName, lastName: studentProfilesTable.lastName })
      .from(studentProfilesTable)
      .where(eq(studentProfilesTable.studentId, updated.studentId))
      .limit(1);

    if (user?.email && ["accepted", "rejected", "waitlisted", "under_review"].includes(body.data.status)) {
      sendApplicationDecisionEmail({
        to: user.email,
        fullName: studentProfile
          ? [studentProfile.firstName, studentProfile.lastName].filter(Boolean).join(" ") || user.fullName
          : user.fullName,
        universityName: uni?.name ?? "The university",
        programName: prog?.name ?? "your programme",
        status: body.data.status,
        decisionReason: body.data.decisionReason,
      }).catch((err) => req.log.warn({ err }, "Failed to send decision email (non-fatal)"));
    }

    if (user) {
      const uniName = uni?.name ?? "The university";
      const progName = prog?.name ?? "your programme";
      const statusLabels: Record<string, string> = {
        accepted: "Accepted",
        rejected: "Rejected",
        waitlisted: "Waitlisted",
        under_review: "Under Review",
      };
      const titleMap: Record<string, string> = {
        accepted: `🎉 Congratulations! You've been accepted`,
        rejected: `Application decision received`,
        waitlisted: `You've been placed on the waitlist`,
        under_review: `Your application is now under review`,
      };
      await db.execute(
        sql`INSERT INTO notifications (user_id, student_id, type, title, message, application_id)
            VALUES (${user.id}, ${updated.studentId}, ${body.data.status},
                    ${titleMap[body.data.status] ?? `Status updated to ${statusLabels[body.data.status] ?? body.data.status}`},
                    ${`${uniName} has updated your application status for ${progName} to "${statusLabels[body.data.status] ?? body.data.status}". ${body.data.decisionReason ? `Reason: ${body.data.decisionReason}` : ""}`.trim()},
                    ${appId})`,
      );
    }
  } catch (notifErr) {
    req.log.warn({ notifErr }, "Failed to insert notification (non-fatal)");
  }

  return res.json({ application: updated });
});

// ── GET /admin/applications/:id/remarks ───────────────────────────────────
router.get("/applications/:id/remarks", async (req, res) => {
  const appId = parseInt(req.params.id);
  if (isNaN(appId)) return res.status(400).json({ error: "Invalid application ID" });

  const [app] = await db
    .select({ universityId: applicationsTable.universityId })
    .from(applicationsTable)
    .where(eq(applicationsTable.id, appId))
    .limit(1);
  if (!app) return res.status(404).json({ error: "Application not found" });
  if (!(await assertAdminApplicationAccess(req, res, app.universityId))) return;

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

  const [app] = await db
    .select({ universityId: applicationsTable.universityId })
    .from(applicationsTable)
    .where(eq(applicationsTable.id, appId))
    .limit(1);
  if (!app) return res.status(404).json({ error: "Application not found" });
  if (!(await assertAdminApplicationAccess(req, res, app.universityId))) return;

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

// ── GET /admin/support/tickets ─────────────────────────────────────────────
router.get("/support/tickets", async (req, res) => {
  try {
    const { status } = req.query as Record<string, string>;
    const tickets = status
      ? await db.select().from(supportTicketsTable)
          .where(eq(supportTicketsTable.status, status as "open" | "in_progress" | "resolved"))
          .orderBy(desc(supportTicketsTable.createdAt))
      : await db.select().from(supportTicketsTable)
          .orderBy(desc(supportTicketsTable.createdAt));
    return res.json({ tickets });
  } catch (err) {
    req.log.error({ err }, "admin list tickets error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── PUT /admin/support/tickets/:id/reply ──────────────────────────────────
const TicketReplyBody = z.object({
  reply: z.string().min(1, "Reply is required"),
  status: z.enum(["open", "in_progress", "resolved"]),
});

router.put("/support/tickets/:id/reply", async (req, res) => {
  const ticketId = parseInt(req.params.id);
  if (isNaN(ticketId)) return res.status(400).json({ error: "Invalid ticket ID" });

  const body = TicketReplyBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.errors[0].message });
  }

  try {
    const admin = req.user!;
    const [ticket] = await db
      .update(supportTicketsTable)
      .set({
        adminReply: body.data.reply,
        status: body.data.status,
        adminId: admin.userId,
        adminName: admin.fullName,
        repliedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(supportTicketsTable.id, ticketId))
      .returning();

    if (!ticket) return res.status(404).json({ error: "Ticket not found" });
    return res.json({ ticket });
  } catch (err) {
    req.log.error({ err }, "admin reply ticket error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ── POST /admin/partners/invite ────────────────────────────────────────────
const PartnerInviteBody = z.object({
  fullName: z.string().min(2, "Name required"),
  email: z.string().email("Valid email required"),
  universityId: z.number().int().positive().optional(),
});

router.post("/partners/invite", async (req, res) => {
  const body = PartnerInviteBody.safeParse(req.body);
  if (!body.success) {
    return res.status(400).json({ error: body.error.errors[0].message });
  }

  const { fullName, email, universityId } = body.data;
  const normalizedEmail = email.toLowerCase().trim();
  const scope = await getAdminUniversityScope(req.user!.userId);
  const assignedUniversityId = scope ?? universityId ?? null;

  const existing = await db.query.usersTable.findFirst({ where: eq(usersTable.email, normalizedEmail) });
  if (existing) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
  const tempPassword = Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  const passwordHash = await bcrypt.hash(tempPassword, 12);

  await db.insert(usersTable).values({
    email: normalizedEmail,
    passwordHash,
    fullName,
    role: "admin",
    studentId: null,
    universityId: assignedUniversityId,
  });

  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  const loginUrl = `${appUrl}/login`;

  console.log("\n========== PARTNER ADMIN INVITE ==========");
  console.log(`Partner: ${fullName} <${normalizedEmail}>`);
  console.log(`Login URL: ${loginUrl}`);
  console.log(
    "A temporary password was generated and stored securely. " +
      "Deliver credentials via transactional email (invite email not yet wired).",
  );
  console.log("==========================================\n");

  req.log.info(
    { email: normalizedEmail, fullName, loginUrl, universityId: assignedUniversityId },
    "Partner admin account created",
  );

  return res.status(201).json({
    email: normalizedEmail,
    fullName,
    loginUrl,
    universityId: assignedUniversityId,
    message:
      "Partner account created. Login credentials must be delivered via secure email — they are never returned in API responses.",
  });
});

export default router;
