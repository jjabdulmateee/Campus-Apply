import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable, studentProfilesTable, universitiesTable, counselorAssignmentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { JWT_SECRET, verifyJWT } from "../middleware/auth";
import { authRateLimiter } from "../middleware/rateLimit";
import { setAuthCookie, clearAuthCookie } from "../lib/sessionCookie";
import { sendVerificationEmail } from "../utils/email";
import { isProduction } from "../lib/env";

const router = Router();

const RegisterBody = z.object({
  fullName: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  mobileNumber: z.string().optional(),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

const LoginBody = z.object({
  email: z.string().email(),
  password: z.string(),
});

function makeToken(user: {
  id: number;
  studentId: string | null;
  email: string;
  fullName: string;
  role: "student" | "admin" | "counselor";
  universityId?: number | null;
}) {
  return jwt.sign(
    {
      userId: user.id,
      studentId: user.studentId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      universityId: user.universityId ?? null,
    },
    JWT_SECRET,
    { expiresIn: "30d" },
  );
}

/** Seed the demo student and admin accounts on first call. */
async function seedDemoAccounts() {
  const DEMO_STUDENT_EMAIL = "student@pakmail.pk";
  const DEMO_ADMIN_EMAIL = "admin@pakmail.pk";
  const DEMO_COUNSELOR_EMAIL = "counselor@pakmail.pk";
  const DEMO_LUMS_ADMIN_EMAIL = "lumsadmin@pakmail.pk";

  let existingStudent = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, DEMO_STUDENT_EMAIL),
  });
  if (!existingStudent) {
    const hash = await bcrypt.hash("demo123", 12);
    const [u] = await db
      .insert(usersTable)
      .values({
        email: DEMO_STUDENT_EMAIL,
        passwordHash: hash,
        fullName: "Demo Student",
        studentId: "demo-student-001",
        role: "student",
      })
      .returning();
    const sid = `user-${u.id}`;
    await db.update(usersTable).set({ studentId: sid }).where(eq(usersTable.id, u.id));
    await db.insert(studentProfilesTable).values({
      studentId: sid,
      firstName: "Demo",
      lastName: "Student",
      email: DEMO_STUDENT_EMAIL,
    });
    existingStudent = await db.query.usersTable.findFirst({ where: eq(usersTable.id, u.id) });
  }

  // Ensure profile row exists for the demo student (in case seeded via seed-demo.ts without profile)
  if (existingStudent?.studentId) {
    const existingProfile = await db.query.studentProfilesTable.findFirst({
      where: eq(studentProfilesTable.studentId, existingStudent.studentId),
    });
    if (!existingProfile) {
      await db.insert(studentProfilesTable).values({
        studentId: existingStudent.studentId,
        firstName: "Demo",
        lastName: "Student",
        email: DEMO_STUDENT_EMAIL,
      });
    }
  }

  const existingAdmin = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, DEMO_ADMIN_EMAIL),
  });
  if (!existingAdmin) {
    const hash = await bcrypt.hash("admin123", 12);
    await db.insert(usersTable).values({
      email: DEMO_ADMIN_EMAIL,
      passwordHash: hash,
      fullName: "University Admin",
      studentId: null,
      role: "admin",
    });
  } else if (existingAdmin.role !== "admin") {
    await db
      .update(usersTable)
      .set({ role: "admin" })
      .where(eq(usersTable.email, DEMO_ADMIN_EMAIL));
  }

  const lums = await db.query.universitiesTable.findFirst({
    where: eq(universitiesTable.shortName, "LUMS"),
  });

  const existingLumsAdmin = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, DEMO_LUMS_ADMIN_EMAIL),
  });
  if (!existingLumsAdmin) {
    const hash = await bcrypt.hash("lumsadmin123", 12);
    await db.insert(usersTable).values({
      email: DEMO_LUMS_ADMIN_EMAIL,
      passwordHash: hash,
      fullName: "LUMS Admissions Admin",
      studentId: null,
      role: "admin",
      universityId: lums?.id ?? null,
    });
  }

  let existingCounselor = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, DEMO_COUNSELOR_EMAIL),
  });
  if (!existingCounselor) {
    const hash = await bcrypt.hash("counselor123", 12);
    const [counselor] = await db
      .insert(usersTable)
      .values({
        email: DEMO_COUNSELOR_EMAIL,
        passwordHash: hash,
        fullName: "Demo Counselor",
        studentId: null,
        role: "counselor",
      })
      .returning();
    existingCounselor = counselor;
  }

  if (existingStudent?.studentId && existingCounselor) {
    const assignment = await db.query.counselorAssignmentsTable.findFirst({
      where: and(
        eq(counselorAssignmentsTable.counselorUserId, existingCounselor.id),
        eq(counselorAssignmentsTable.studentId, existingStudent.studentId),
      ),
    });
    if (!assignment) {
      await db.insert(counselorAssignmentsTable).values({
        counselorUserId: existingCounselor.id,
        studentId: existingStudent.studentId,
      });
    }
  }

}

/** Update university filter metadata (runs once on startup) */
async function ensureUniversityMetadata() {
  const metadata: Array<{
    shortName: string;
    deadlineType: string;
    applicationFeeRequired: boolean;
    essayRequired: boolean;
    acceptsTransfer: boolean;
  }> = [
    { shortName: "LUMS",     deadlineType: "early_action",      applicationFeeRequired: true,  essayRequired: true,  acceptsTransfer: false },
    { shortName: "NUST",     deadlineType: "early_action",      applicationFeeRequired: false, essayRequired: false, acceptsTransfer: true  },
    { shortName: "FAST-NU",  deadlineType: "regular_decision",  applicationFeeRequired: true,  essayRequired: false, acceptsTransfer: true  },
    { shortName: "IBA",      deadlineType: "regular_decision",  applicationFeeRequired: true,  essayRequired: true,  acceptsTransfer: false },
    { shortName: "UET",      deadlineType: "rolling",           applicationFeeRequired: false, essayRequired: false, acceptsTransfer: true  },
    { shortName: "AKU",      deadlineType: "early_action",      applicationFeeRequired: true,  essayRequired: true,  acceptsTransfer: false },
    { shortName: "COMSATS",  deadlineType: "rolling",           applicationFeeRequired: false, essayRequired: false, acceptsTransfer: true  },
    { shortName: "PU",       deadlineType: "rolling",           applicationFeeRequired: false, essayRequired: false, acceptsTransfer: true  },
    { shortName: "QAU",      deadlineType: "rolling",           applicationFeeRequired: false, essayRequired: false, acceptsTransfer: true  },
    { shortName: "UOP",      deadlineType: "rolling",           applicationFeeRequired: false, essayRequired: false, acceptsTransfer: true  },
    { shortName: "BUITEMS",  deadlineType: "rolling",           applicationFeeRequired: false, essayRequired: false, acceptsTransfer: true  },
    { shortName: "HU",       deadlineType: "regular_decision",  applicationFeeRequired: true,  essayRequired: true,  acceptsTransfer: false },
  ];

  for (const m of metadata) {
    await db
      .update(universitiesTable)
      .set({
        deadlineType: m.deadlineType,
        applicationFeeRequired: m.applicationFeeRequired,
        essayRequired: m.essayRequired,
        acceptsTransfer: m.acceptsTransfer,
      })
      .where(eq(universitiesTable.shortName, m.shortName));
  }
}

let seeded = false;
router.use(async (_req, _res, next) => {
  if (!seeded) {
    seeded = true;
    if (!isProduction()) {
      await seedDemoAccounts().catch(() => {});
    }
    await ensureUniversityMetadata().catch(() => {});
  }
  next();
});

router.post("/register", authRateLimiter, async (req, res) => {
  try {
    const { fullName, email, mobileNumber, password } = RegisterBody.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, normalizedEmail),
    });
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const tempStudentId = `reg-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const [user] = await db
      .insert(usersTable)
      .values({
        email: normalizedEmail,
        passwordHash,
        fullName,
        mobileNumber: mobileNumber ?? null,
        studentId: tempStudentId,
        role: "student",
      })
      .returning();

    const studentId = `user-${user.id}`;
    await db.update(usersTable).set({ studentId }).where(eq(usersTable.id, user.id));

    const nameParts = fullName.trim().split(/\s+/);
    const firstName = nameParts[0];
    const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : firstName;

    await db.insert(studentProfilesTable).values({
      studentId,
      firstName,
      lastName,
      email: normalizedEmail,
      phoneNumber: mobileNumber ?? null,
    });

    const sessionToken = makeToken({ ...user, studentId, role: "student" });
    setAuthCookie(res, sessionToken);

    const verifyToken = crypto.randomUUID();
    const verifyExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db
      .update(usersTable)
      .set({ verificationToken: verifyToken, verificationTokenExpiry: verifyExpiry })
      .where(eq(usersTable.id, user.id));

    sendVerificationEmail({ to: normalizedEmail, fullName, token: verifyToken }).catch(() => {});

    return res.status(201).json({
      user: { id: user.id, email: normalizedEmail, fullName, studentId, role: "student" },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    throw err;
  }
});

router.post("/login", authRateLimiter, async (req, res) => {
  try {
    const { email, password } = LoginBody.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, normalizedEmail),
    });
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid email or password" });
    }

    const sessionToken = makeToken(user);
    setAuthCookie(res, sessionToken);

    return res.json({
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        studentId: user.studentId,
        role: user.role,
        universityId: user.universityId ?? null,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    throw err;
  }
});

router.get("/me", verifyJWT, async (req, res) => {
  const user = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, req.user!.userId),
  });
  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }
  return res.json({
    id: user.id,
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    studentId: user.studentId,
    role: user.role,
    universityId: user.universityId ?? null,
  });
});

const ForgotPasswordBody = z.object({
  email: z.string().email("Valid email required"),
});

const ResetPasswordBody = z.object({
  token: z.string().min(1, "Reset token is required"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

/** POST /api/auth/logout — clear the HttpOnly session cookie */
router.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  return res.json({ ok: true });
});

/** POST /api/auth/forgot-password — generate reset token (logged to console in dev) */
router.post("/forgot-password", authRateLimiter, async (req, res) => {
  try {
    const { email } = ForgotPasswordBody.parse(req.body);
    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, normalizedEmail),
    });

    if (user) {
      const resetToken = crypto.randomUUID();
      const expiry = new Date(Date.now() + 60 * 60 * 1000);
      await db
        .update(usersTable)
        .set({ passwordResetToken: resetToken, passwordResetTokenExpiry: expiry })
        .where(eq(usersTable.id, user.id));

      const appUrl = process.env.APP_URL ?? "http://localhost:3000";
      const resetLink = `${appUrl}/reset-password?token=${resetToken}`;
      console.log("\n========== PASSWORD RESET LINK ==========");
      console.log(resetLink);
      console.log("=========================================\n");
    }

    return res.json({
      ok: true,
      message: "If an account exists for that email, a reset link has been sent.",
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    throw err;
  }
});

/** POST /api/auth/reset-password — set new password using reset token */
router.post("/reset-password", async (req, res) => {
  try {
    const { token, password } = ResetPasswordBody.parse(req.body);

    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.passwordResetToken, token),
    });

    if (!user) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    if (user.passwordResetTokenExpiry && user.passwordResetTokenExpiry < new Date()) {
      return res.status(410).json({ error: "Reset link has expired. Please request a new one." });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    await db
      .update(usersTable)
      .set({
        passwordHash,
        passwordResetToken: null,
        passwordResetTokenExpiry: null,
      })
      .where(eq(usersTable.id, user.id));

    return res.json({ ok: true, message: "Password updated successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    throw err;
  }
});

/** POST /api/auth/send-verification — send (or resend) verification email to the logged-in user */
router.post("/send-verification", verifyJWT, async (req, res) => {
  try {
    const userId = req.user!.userId;
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (!user) return res.status(404).json({ error: "User not found" });

    if (user.emailVerified) {
      return res.status(400).json({ error: "Email is already verified" });
    }

    const token = crypto.randomUUID();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await db
      .update(usersTable)
      .set({ verificationToken: token, verificationTokenExpiry: expiry })
      .where(eq(usersTable.id, userId));

    sendVerificationEmail({ to: user.email, fullName: user.fullName, token }).catch((err) =>
      req.log.error({ err }, "Failed to send verification email"),
    );

    return res.json({ ok: true });
  } catch (err) {
    req.log.error({ err }, "send-verification error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/auth/verify-email?token=xxx — verify token and mark email as verified */
router.get("/verify-email", async (req, res) => {
  const tokenParam = z.string().min(1).safeParse(req.query.token);
  if (!tokenParam.success) {
    return res.status(400).json({ error: "Missing or invalid token" });
  }

  try {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.verificationToken, tokenParam.data),
    });

    if (!user) {
      return res.status(404).json({ error: "Invalid verification token" });
    }

    if (user.emailVerified) {
      return res.json({ ok: true, alreadyVerified: true });
    }

    if (user.verificationTokenExpiry && user.verificationTokenExpiry < new Date()) {
      return res.status(410).json({ error: "Verification link has expired. Please request a new one." });
    }

    await db
      .update(usersTable)
      .set({ emailVerified: true, verificationToken: null, verificationTokenExpiry: null })
      .where(eq(usersTable.id, user.id));

    return res.json({ ok: true, alreadyVerified: false });
  } catch (err) {
    req.log.error({ err }, "verify-email error");
    return res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
