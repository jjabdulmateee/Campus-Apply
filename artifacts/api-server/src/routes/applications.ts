import { Router } from "express";
import { db } from "@workspace/db";
import { applicationsTable, universitiesTable, programsTable } from "@workspace/db";
import {
  CreateApplicationBody,
  UpdateApplicationBody,
  UpdateApplicationParams,
  GetApplicationParams,
  WithdrawApplicationParams,
  SubmitApplicationParams,
} from "@workspace/api-zod";
import { eq, and } from "drizzle-orm";

const router = Router();
const DEMO_STUDENT_ID = "demo-student-001";

router.get("/summary", async (req, res) => {
  const apps = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.studentId, DEMO_STUDENT_ID));

  const summary = {
    total: apps.length,
    draft: apps.filter((a) => a.status === "draft").length,
    submitted: apps.filter((a) => a.status === "submitted").length,
    under_review: apps.filter((a) => a.status === "under_review").length,
    accepted: apps.filter((a) => a.status === "accepted").length,
    rejected: apps.filter((a) => a.status === "rejected").length,
    waitlisted: apps.filter((a) => a.status === "waitlisted").length,
  };

  res.json(summary);
});

router.get("/", async (req, res) => {
  const apps = await db
    .select()
    .from(applicationsTable)
    .where(eq(applicationsTable.studentId, DEMO_STUDENT_ID));

  const enriched = await Promise.all(
    apps.map(async (a) => {
      const uni = await db.query.universitiesTable.findFirst({ where: eq(universitiesTable.id, a.universityId) });
      const prog = await db.query.programsTable.findFirst({ where: eq(programsTable.id, a.programId) });
      return {
        ...a,
        universityName: uni?.name ?? "Unknown University",
        programName: prog?.name ?? "Unknown Program",
      };
    })
  );

  res.json(enriched);
});

router.post("/", async (req, res) => {
  const body = CreateApplicationBody.parse(req.body);
  const [app] = await db
    .insert(applicationsTable)
    .values({ ...body, studentId: DEMO_STUDENT_ID, status: "draft" })
    .returning();

  const uni = await db.query.universitiesTable.findFirst({ where: eq(universitiesTable.id, body.universityId) });
  const prog = await db.query.programsTable.findFirst({ where: eq(programsTable.id, body.programId) });

  res.status(201).json({
    ...app,
    universityName: uni?.name ?? "Unknown University",
    programName: prog?.name ?? "Unknown Program",
  });
});

router.get("/:applicationId", async (req, res) => {
  const { applicationId } = GetApplicationParams.parse(req.params);
  const app = await db.query.applicationsTable.findFirst({
    where: and(
      eq(applicationsTable.id, applicationId),
      eq(applicationsTable.studentId, DEMO_STUDENT_ID)
    ),
  });

  if (!app) return res.status(404).json({ error: "Not found" });

  const uni = await db.query.universitiesTable.findFirst({ where: eq(universitiesTable.id, app.universityId) });
  const prog = await db.query.programsTable.findFirst({ where: eq(programsTable.id, app.programId) });

  res.json({
    ...app,
    universityName: uni?.name ?? "Unknown",
    programName: prog?.name ?? "Unknown",
  });
});

router.put("/:applicationId", async (req, res) => {
  const { applicationId } = UpdateApplicationParams.parse(req.params);
  const body = UpdateApplicationBody.parse(req.body);
  const [updated] = await db
    .update(applicationsTable)
    .set({ ...body, updatedAt: new Date() })
    .where(
      and(
        eq(applicationsTable.id, applicationId),
        eq(applicationsTable.studentId, DEMO_STUDENT_ID)
      )
    )
    .returning();

  const uni = await db.query.universitiesTable.findFirst({ where: eq(universitiesTable.id, updated.universityId) });
  const prog = await db.query.programsTable.findFirst({ where: eq(programsTable.id, updated.programId) });

  res.json({ ...updated, universityName: uni?.name ?? "Unknown", programName: prog?.name ?? "Unknown" });
});

router.delete("/:applicationId", async (req, res) => {
  const { applicationId } = WithdrawApplicationParams.parse(req.params);
  await db
    .update(applicationsTable)
    .set({ status: "withdrawn", updatedAt: new Date() })
    .where(
      and(
        eq(applicationsTable.id, applicationId),
        eq(applicationsTable.studentId, DEMO_STUDENT_ID)
      )
    );
  res.status(204).send();
});

router.post("/:applicationId/submit", async (req, res) => {
  const { applicationId } = SubmitApplicationParams.parse(req.params);
  const [updated] = await db
    .update(applicationsTable)
    .set({ status: "submitted", submittedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(applicationsTable.id, applicationId),
        eq(applicationsTable.studentId, DEMO_STUDENT_ID)
      )
    )
    .returning();

  const uni = await db.query.universitiesTable.findFirst({ where: eq(universitiesTable.id, updated.universityId) });
  const prog = await db.query.programsTable.findFirst({ where: eq(programsTable.id, updated.programId) });

  res.json({ ...updated, universityName: uni?.name ?? "Unknown", programName: prog?.name ?? "Unknown" });
});

export default router;
