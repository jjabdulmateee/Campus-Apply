import { Router } from "express";
import { z } from "zod";
import { db } from "@workspace/db";
import {
  counselorAssignmentsTable,
  studentProfilesTable,
  documentsTable,
} from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { verifyJWT } from "../middleware/auth";
import { assertUploadOwnedBy, UploadOwnershipError } from "../lib/uploadRegistry";

const router = Router();

function requireCounselor(
  req: import("express").Request,
  res: import("express").Response,
  next: import("express").NextFunction,
): void {
  verifyJWT(req, res, () => {
    if (req.user?.role !== "counselor") {
      res.status(403).json({ error: "Counselor access required" });
      return;
    }
    next();
  });
}

router.use(requireCounselor);

/** GET /api/counselor/students — students who assigned this counselor */
router.get("/students", async (req, res) => {
  const counselorUserId = req.user!.userId;

  const assignments = await db
    .select({
      assignmentId: counselorAssignmentsTable.id,
      studentId: counselorAssignmentsTable.studentId,
      schoolReportObjectPath: counselorAssignmentsTable.schoolReportObjectPath,
      assignedAt: counselorAssignmentsTable.assignedAt,
      firstName: studentProfilesTable.firstName,
      lastName: studentProfilesTable.lastName,
      email: studentProfilesTable.email,
    })
    .from(counselorAssignmentsTable)
    .leftJoin(
      studentProfilesTable,
      eq(counselorAssignmentsTable.studentId, studentProfilesTable.studentId),
    )
    .where(eq(counselorAssignmentsTable.counselorUserId, counselorUserId));

  res.json({
    students: assignments.map((a) => ({
      assignmentId: a.assignmentId,
      studentId: a.studentId,
      studentName: [a.firstName, a.lastName].filter(Boolean).join(" ") || "Unknown",
      email: a.email ?? "",
      schoolReportObjectPath: a.schoolReportObjectPath,
      assignedAt: a.assignedAt,
    })),
  });
});

const SchoolReportBody = z.object({
  objectPath: z.string().min(1),
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
});

/** POST /api/counselor/students/:studentId/school-report */
router.post("/students/:studentId/school-report", async (req, res) => {
  const counselorUserId = req.user!.userId;
  const { studentId } = req.params;
  const body = SchoolReportBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.errors[0]?.message ?? "Invalid body" });
    return;
  }

  const [assignment] = await db
    .select()
    .from(counselorAssignmentsTable)
    .where(
      and(
        eq(counselorAssignmentsTable.counselorUserId, counselorUserId),
        eq(counselorAssignmentsTable.studentId, studentId),
      ),
    )
    .limit(1);

  if (!assignment) {
    res.status(404).json({ error: "This student has not assigned you as their counselor" });
    return;
  }

  const { objectPath, fileName, fileSize, mimeType } = body.data;

  try {
    await assertUploadOwnedBy(objectPath, counselorUserId);
  } catch (err) {
    if (err instanceof UploadOwnershipError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    throw err;
  }

  await db.insert(documentsTable).values({
    studentId,
    category: "school_report",
    fileName,
    fileSize,
    mimeType,
    objectPath,
  });

  await db
    .update(counselorAssignmentsTable)
    .set({ schoolReportObjectPath: objectPath })
    .where(eq(counselorAssignmentsTable.id, assignment.id));

  res.status(201).json({ objectPath, message: "School report uploaded successfully" });
});

export default router;
