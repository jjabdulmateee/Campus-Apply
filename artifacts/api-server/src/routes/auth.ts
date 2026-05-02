import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { db } from "@workspace/db";
import { usersTable, studentProfilesTable } from "@workspace/db";
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

router.post("/register", async (req, res) => {
  try {
    const { fullName, email, mobileNumber, password } = RegisterBody.parse(
      req.body,
    );
    const normalizedEmail = email.toLowerCase().trim();

    const existing = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, normalizedEmail),
    });
    if (existing) {
      return res
        .status(409)
        .json({ error: "An account with this email already exists" });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // Use a temp unique studentId — updated below once we have the DB-generated id
    const tempStudentId = `reg-${Date.now()}-${Math.floor(Math.random() * 1e6)}`;
    const [user] = await db
      .insert(usersTable)
      .values({
        email: normalizedEmail,
        passwordHash,
        fullName,
        mobileNumber: mobileNumber ?? null,
        studentId: tempStudentId,
      })
      .returning();

    const studentId = `user-${user.id}`;
    await db
      .update(usersTable)
      .set({ studentId })
      .where(eq(usersTable.id, user.id));

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

    const token = jwt.sign(
      { userId: user.id, studentId, email: normalizedEmail, fullName },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    return res.status(201).json({
      token,
      user: { id: user.id, email: normalizedEmail, fullName, studentId },
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

    const token = jwt.sign(
      {
        userId: user.id,
        studentId: user.studentId,
        email: user.email,
        fullName: user.fullName,
      },
      JWT_SECRET,
      { expiresIn: "30d" },
    );

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        studentId: user.studentId,
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
