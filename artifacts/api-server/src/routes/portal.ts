import { Router } from "express";
import { db } from "@workspace/db";
import { recommendersTable, studentProfilesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { z } from "zod";

const router = Router();

router.get("/portal/validate", async (req, res) => {
  const result = z.string().min(1).safeParse(req.query.token);
  if (!result.success) {
    return res.status(400).json({ error: "Missing or invalid token" });
  }

  const rec = await db.query.recommendersTable.findFirst({
    where: eq(recommendersTable.inviteToken, result.data),
  });

  if (!rec) {
    return res.status(404).json({ error: "Invalid or expired link" });
  }

  if (rec.tokenUsed) {
    return res.status(410).json({ error: "This link has already been used. Your letter was already submitted." });
  }

  const profile = await db.query.studentProfilesTable.findFirst({
    where: eq(studentProfilesTable.studentId, rec.studentId),
  });

  const studentName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : "a student";

  return res.json({
    recommenderName: `${rec.firstName} ${rec.lastName}`,
    studentName,
    subjectTaught: rec.subjectTaught,
    relationship: rec.relationship ?? null,
  });
});

router.post("/portal/submit", async (req, res) => {
  const body = z
    .object({
      token: z.string().min(1),
      letterContent: z.string().refine(
        (s) => s.trim().split(/\s+/).filter(Boolean).length >= 150,
        "Letter must be at least 150 words",
      ),
      yearsKnown: z.string().min(1, "Please specify how long you have known the student"),
    })
    .parse(req.body);

  const rec = await db.query.recommendersTable.findFirst({
    where: eq(recommendersTable.inviteToken, body.token),
  });

  if (!rec) {
    return res.status(404).json({ error: "Invalid or expired link" });
  }

  if (rec.tokenUsed) {
    return res.status(410).json({ error: "This link has already been used" });
  }

  await db
    .update(recommendersTable)
    .set({
      status: "submitted",
      tokenUsed: true,
      letterContent: body.letterContent,
      yearsKnown: body.yearsKnown,
      submittedAt: new Date(),
    })
    .where(eq(recommendersTable.id, rec.id));

  return res.json({ success: true });
});

export default router;
