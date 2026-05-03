import { Router } from "express";
import { db } from "@workspace/db";
import { recommendersTable, studentProfilesTable } from "@workspace/db";
import { InviteRecommenderBody } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { verifyJWT, getStudentId } from "../middleware/auth";
import { sendRecommendationInvite } from "../utils/email";
import { z } from "zod";

const router = Router();
router.use(verifyJWT);

router.get("/me/recommenders", async (req, res) => {
  const sid = getStudentId(req);
  const rows = await db
    .select()
    .from(recommendersTable)
    .where(eq(recommendersTable.studentId, sid));
  res.json(rows);
});

router.post("/me/recommenders", async (req, res) => {
  const sid = getStudentId(req);
  const body = InviteRecommenderBody.parse(req.body);
  const token = crypto.randomUUID();

  const [created] = await db
    .insert(recommendersTable)
    .values({ ...body, studentId: sid, inviteToken: token })
    .returning();

  const profile = await db.query.studentProfilesTable.findFirst({
    where: eq(studentProfilesTable.studentId, sid),
  });
  const studentName = profile
    ? `${profile.firstName} ${profile.lastName}`
    : "A student";

  sendRecommendationInvite({
    to: body.email,
    teacherName: `${body.firstName} ${body.lastName}`,
    studentName,
    token,
  }).catch((err) =>
    req.log.error({ err }, "Failed to send recommendation invite email"),
  );

  res.status(201).json(created);
});

router.delete("/me/recommenders/:recommenderId", async (req, res) => {
  const sid = getStudentId(req);
  const recommenderId = z.coerce.number().parse(req.params.recommenderId);
  await db
    .delete(recommendersTable)
    .where(
      and(
        eq(recommendersTable.id, recommenderId),
        eq(recommendersTable.studentId, sid),
      ),
    );
  res.status(204).send();
});

export default router;
