import { Router } from "express";
import { db } from "@workspace/db";
import { recommendersTable } from "@workspace/db";
import { InviteRecommenderBody } from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";
import { verifyJWT, getStudentId } from "../middleware/auth";
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
  const [created] = await db
    .insert(recommendersTable)
    .values({ ...body, studentId: sid })
    .returning();
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
