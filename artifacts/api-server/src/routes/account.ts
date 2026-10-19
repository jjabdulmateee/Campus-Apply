import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "@workspace/db";
import {
  usersTable,
  userPreferencesTable,
  applicationsTable,
  applicationAnswersTable,
  documentsTable,
  studentProfilesTable,
  academicRecordsTable,
  testScoresTable,
  activitiesTable,
  essaysTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { verifyJWT } from "../middleware/auth";
import {
  isLocalStorageBackend,
  prepareLocalUpload,
} from "../lib/localDiskStorage";
import { ObjectStorageService } from "../lib/objectStorage";
import {
  registerUpload,
  assertUploadOwnedBy,
  UploadOwnershipError,
} from "../lib/uploadRegistry";

const router = Router();
router.use(verifyJWT);

const gcsStorage = new ObjectStorageService();

/** GET /api/account/me — full account info including avatar + prefs */
router.get("/me", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const prefs = await db.query.userPreferencesTable.findFirst({
      where: eq(userPreferencesTable.userId, userId),
    });

    res.json({
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl ?? null,
      role: user.role,
      preferences: prefs
        ? {
            emailOnStatusChange: prefs.emailOnStatusChange,
            deadlineReminders: prefs.deadlineReminders,
            weeklyDigest: prefs.weeklyDigest,
          }
        : { emailOnStatusChange: true, deadlineReminders: true, weeklyDigest: false },
    });
  } catch (err) {
    req.log.error({ err }, "account/me error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PUT /api/account/change-password */
router.put("/change-password", async (req, res) => {
  try {
    const schema = z.object({
      currentPassword: z.string().min(1, "Current password required"),
      newPassword: z.string().min(8, "New password must be at least 8 characters"),
    });
    const { currentPassword, newPassword } = schema.parse(req.body);
    const userId = req.user!.userId;

    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) { res.status(400).json({ error: "Current password is incorrect" }); return; }

    const newHash = await bcrypt.hash(newPassword, 12);
    await db.update(usersTable).set({ passwordHash: newHash }).where(eq(usersTable.id, userId));

    res.json({ message: "Password updated successfully" });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    req.log.error({ err }, "change-password error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PUT /api/account/change-email */
router.put("/change-email", async (req, res) => {
  try {
    const schema = z.object({
      newEmail: z.string().email("Invalid email address"),
      password: z.string().min(1, "Password required"),
    });
    const { newEmail, password } = schema.parse(req.body);
    const normalizedEmail = newEmail.toLowerCase().trim();
    const userId = req.user!.userId;

    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(400).json({ error: "Password is incorrect" }); return; }

    const existing = await db.query.usersTable.findFirst({
      where: eq(usersTable.email, normalizedEmail),
    });
    if (existing && existing.id !== userId) {
      res.status(409).json({ error: "This email is already in use by another account" });
      return;
    }

    await db.update(usersTable).set({ email: normalizedEmail }).where(eq(usersTable.id, userId));

    if (user.studentId) {
      await db
        .update(studentProfilesTable)
        .set({ email: normalizedEmail })
        .where(eq(studentProfilesTable.studentId, user.studentId));
    }

    res.json({ email: normalizedEmail, message: "Email updated. Please log in again with your new email." });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    req.log.error({ err }, "change-email error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** POST /api/account/avatar/request-url — get a presigned upload URL for avatar */
router.post("/avatar/request-url", async (req, res) => {
  try {
    const schema = z.object({
      size: z.number(),
      contentType: z.string(),
    });
    const { size, contentType } = schema.parse(req.body);

    const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    const MAX_SIZE = 2 * 1024 * 1024;

    if (!ALLOWED.includes(contentType)) {
      res.status(400).json({ error: "Only JPG, PNG, and WebP images are allowed" });
      return;
    }
    if (size > MAX_SIZE) {
      res.status(400).json({ error: "File size must not exceed 2MB" });
      return;
    }

    let uploadURL: string;
    let objectPath: string;

    if (isLocalStorageBackend()) {
      const prepared = await prepareLocalUpload(req.user!.userId);
      uploadURL = prepared.uploadURL;
      objectPath = prepared.objectPath;
    } else {
      uploadURL = await gcsStorage.getObjectEntityUploadURL();
      objectPath = gcsStorage.normalizeObjectEntityPath(uploadURL);
    }

    await registerUpload({
      objectPath,
      uploaderUserId: req.user!.userId,
      purpose: "avatar",
      contentType,
      sizeBytes: size,
    });

    res.json({ uploadURL, objectPath });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    req.log.error({ err }, "avatar request-url error");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/** PUT /api/account/avatar — save the avatar objectPath after upload */
router.put("/avatar", async (req, res) => {
  try {
    const schema = z.object({ objectPath: z.string().min(1) });
    const { objectPath } = schema.parse(req.body);
    const userId = req.user!.userId;

    await assertUploadOwnedBy(objectPath, userId);

    await db.update(usersTable).set({ avatarUrl: objectPath }).where(eq(usersTable.id, userId));

    res.json({ avatarUrl: objectPath });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    if (err instanceof UploadOwnershipError) { res.status(err.status).json({ error: err.message }); return; }
    req.log.error({ err }, "avatar save error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** GET /api/account/preferences */
router.get("/preferences", async (req, res) => {
  try {
    const userId = req.user!.userId;
    const prefs = await db.query.userPreferencesTable.findFirst({
      where: eq(userPreferencesTable.userId, userId),
    });
    res.json(
      prefs
        ? { emailOnStatusChange: prefs.emailOnStatusChange, deadlineReminders: prefs.deadlineReminders, weeklyDigest: prefs.weeklyDigest }
        : { emailOnStatusChange: true, deadlineReminders: true, weeklyDigest: false },
    );
  } catch (err) {
    req.log.error({ err }, "preferences get error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** PUT /api/account/preferences */
router.put("/preferences", async (req, res) => {
  try {
    const schema = z.object({
      emailOnStatusChange: z.boolean().optional(),
      deadlineReminders: z.boolean().optional(),
      weeklyDigest: z.boolean().optional(),
    });
    const updates = schema.parse(req.body);
    const userId = req.user!.userId;

    const existing = await db.query.userPreferencesTable.findFirst({
      where: eq(userPreferencesTable.userId, userId),
    });

    if (existing) {
      await db.update(userPreferencesTable).set({ ...updates, updatedAt: new Date() }).where(eq(userPreferencesTable.userId, userId));
    } else {
      await db.insert(userPreferencesTable).values({ userId, ...updates });
    }

    const prefs = await db.query.userPreferencesTable.findFirst({
      where: eq(userPreferencesTable.userId, userId),
    });
    res.json({
      emailOnStatusChange: prefs!.emailOnStatusChange,
      deadlineReminders: prefs!.deadlineReminders,
      weeklyDigest: prefs!.weeklyDigest,
    });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    req.log.error({ err }, "preferences update error");
    res.status(500).json({ error: "Internal server error" });
  }
});

/** DELETE /api/account — hard delete all user data */
router.delete("/", async (req, res) => {
  try {
    const schema = z.object({ password: z.string().min(1, "Password required to confirm deletion") });
    const { password } = schema.parse(req.body);
    const userId = req.user!.userId;

    const user = await db.query.usersTable.findFirst({ where: eq(usersTable.id, userId) });
    if (!user) { res.status(404).json({ error: "User not found" }); return; }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) { res.status(400).json({ error: "Password is incorrect" }); return; }

    if (user.studentId) {
      await db.delete(applicationAnswersTable).where(eq(applicationAnswersTable.studentId, user.studentId));
      await db.delete(applicationsTable).where(eq(applicationsTable.studentId, user.studentId));
      await db.delete(documentsTable).where(eq(documentsTable.studentId, user.studentId));
      await db.delete(essaysTable).where(eq(essaysTable.studentId, user.studentId));
      await db.delete(activitiesTable).where(eq(activitiesTable.studentId, user.studentId));
      await db.delete(testScoresTable).where(eq(testScoresTable.studentId, user.studentId));
      await db.delete(academicRecordsTable).where(eq(academicRecordsTable.studentId, user.studentId));
      await db.delete(studentProfilesTable).where(eq(studentProfilesTable.studentId, user.studentId));
    }
    await db.delete(userPreferencesTable).where(eq(userPreferencesTable.userId, userId));
    await db.delete(usersTable).where(eq(usersTable.id, userId));

    res.json({ message: "Account and all associated data have been permanently deleted." });
  } catch (err) {
    if (err instanceof z.ZodError) { res.status(400).json({ error: err.errors[0].message }); return; }
    req.log.error({ err }, "account delete error");
    res.status(500).json({ error: "Internal server error" });
  }
});

export default router;
