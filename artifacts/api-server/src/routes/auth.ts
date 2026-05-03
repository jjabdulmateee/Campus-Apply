import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable, studentProfilesTable, universitiesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { JWT_SECRET, verifyJWT } from "../middleware/auth";

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
  role: "student" | "admin";
}) {
  return jwt.sign(
    {
      userId: user.id,
      studentId: user.studentId,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: "30d" },
  );
}

/** Seed the demo student and admin accounts on first call. */
async function seedDemoAccounts() {
  const DEMO_STUDENT_EMAIL = "student@pakmail.pk";
  const DEMO_ADMIN_EMAIL = "admin@pakmail.pk";

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

  // Ensure the demo student account has admin role for demo toggle
  const demoStudent = await db.query.usersTable.findFirst({
    where: eq(usersTable.email, DEMO_STUDENT_EMAIL),
  });
  if (demoStudent && demoStudent.role !== "admin") {
    await db
      .update(usersTable)
      .set({ role: "admin" })
      .where(eq(usersTable.email, DEMO_STUDENT_EMAIL));
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
    await seedDemoAccounts().catch(() => {});
    await ensureUniversityMetadata().catch(() => {});
  }
  next();
});

router.post("/register", async (req, res) => {
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

    const token = makeToken({ ...user, studentId, role: "student" });

    return res.status(201).json({
      token,
      user: { id: user.id, email: normalizedEmail, fullName, studentId, role: "student" },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    throw err;
  }
});

router.post("/login", async (req, res) => {
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

    const token = makeToken(user);

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        studentId: user.studentId,
        role: user.role,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.errors[0].message });
    }
    throw err;
  }
});

router.get("/me", verifyJWT, (req, res) => {
  res.json(req.user);
});

export default router;
