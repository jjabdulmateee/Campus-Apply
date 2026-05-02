import { Router } from "express";
import { db } from "@workspace/db";
import { documentsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { z } from "zod/v4";
import { optionalJWT, getStudentId } from "../middleware/auth";

const router = Router();
router.use(optionalJWT);

const DocumentCategoryEnum = z.enum([
  "cnic_front",
  "cnic_back",
  "b_form",
  "matric_marksheet",
  "fsc_transcript",
  "a_level_transcript",
  "o_level_transcript",
  "passport_photo",
  "other",
]);

const CreateDocumentBody = z.object({
  category: DocumentCategoryEnum,
  fileName: z.string().min(1),
  fileSize: z.number().int().positive(),
  mimeType: z.string().min(1),
  objectPath: z.string().min(1),
});

router.get("/", async (req, res) => {
  const sid = getStudentId(req);
  const docs = await db
    .select()
    .from(documentsTable)
    .where(eq(documentsTable.studentId, sid));
  res.json(docs);
});

router.post("/", async (req, res) => {
  const sid = getStudentId(req);
  const parsed = CreateDocumentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Invalid document data" });
    return;
  }

  const { category, fileName, fileSize, mimeType, objectPath } = parsed.data;

  const [doc] = await db
    .insert(documentsTable)
    .values({
      studentId: sid,
      category,
      fileName,
      fileSize,
      mimeType,
      objectPath,
      isVerified: false,
    })
    .returning();

  res.status(201).json(doc);
});

router.delete("/:id", async (req, res) => {
  const sid = getStudentId(req);
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid document id" });
    return;
  }

  await db
    .delete(documentsTable)
    .where(and(eq(documentsTable.id, id), eq(documentsTable.studentId, sid)));

  res.json({ success: true });
});

export default router;
