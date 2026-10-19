import { db } from "@workspace/db";
import {
  documentsTable,
  studentProfilesTable,
  academicRecordsTable,
} from "@workspace/db";
import { and, eq, inArray } from "drizzle-orm";

type DocumentCategory = typeof documentsTable.$inferInsert["category"];

function objectPathCandidates(objectPath: string): string[] {
  const trimmed = objectPath.trim();
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return [withSlash, withSlash.slice(1)];
}

function fileNameFromPath(objectPath: string, fallback: string): string {
  const last = objectPath.split("/").filter(Boolean).pop();
  return last && last.length > 0 ? last : fallback;
}

function categoryForAcademicLevel(level: string | null | undefined): DocumentCategory {
  switch (level) {
    case "matric":
      return "matric_marksheet";
    case "o_levels":
      return "o_level_transcript";
    case "intermediate":
      return "fsc_transcript";
    case "a_levels":
      return "a_level_transcript";
    default:
      return "other";
  }
}

/**
 * Insert (or reuse) a Document Locker row for an object the student already
 * uploaded. Profile + education uploads go through this so university reviewers
 * see the same files in the Admin Application Detail queue.
 */
export async function upsertLockerDocument(params: {
  studentId: string;
  category: DocumentCategory;
  objectPath: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
}): Promise<typeof documentsTable.$inferSelect | null> {
  const objectPath = params.objectPath.trim();
  if (!objectPath) return null;

  const candidates = objectPathCandidates(objectPath);
  const canonical = objectPath.startsWith("/") ? objectPath : `/${objectPath}`;

  const [existing] = await db
    .select()
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.studentId, params.studentId),
        inArray(documentsTable.objectPath, candidates),
      ),
    )
    .limit(1);

  if (existing) return existing;

  const [inserted] = await db
    .insert(documentsTable)
    .values({
      studentId: params.studentId,
      category: params.category,
      fileName: params.fileName ?? fileNameFromPath(canonical, params.category),
      fileSize: params.fileSize ?? 0,
      mimeType: params.mimeType ?? "application/octet-stream",
      objectPath: canonical,
      isVerified: false,
    })
    .returning();

  return inserted ?? null;
}

/**
 * Mirror CNIC / transcript / photo / academic marksheet URLs stored on the
 * profile into the documents table so they appear in the admin queue.
 */
export async function syncProfileDocumentsToLocker(studentId: string): Promise<void> {
  const [profile, academics] = await Promise.all([
    db.query.studentProfilesTable.findFirst({
      where: eq(studentProfilesTable.studentId, studentId),
    }),
    db.select().from(academicRecordsTable).where(eq(academicRecordsTable.studentId, studentId)),
  ]);

  if (profile?.cnicDocumentUrl) {
    await upsertLockerDocument({
      studentId,
      category: "cnic_front",
      objectPath: profile.cnicDocumentUrl,
      fileName: "CNIC / B-Form",
    });
  }
  if (profile?.transcriptUrl) {
    await upsertLockerDocument({
      studentId,
      category: "fsc_transcript",
      objectPath: profile.transcriptUrl,
      fileName: "Academic Transcript",
    });
  }
  if (profile?.photoUrl) {
    await upsertLockerDocument({
      studentId,
      category: "passport_photo",
      objectPath: profile.photoUrl,
      fileName: "Passport Photo",
    });
  }

  for (const record of academics) {
    if (!record.transcriptDocUrl) continue;
    await upsertLockerDocument({
      studentId,
      category: categoryForAcademicLevel(record.level),
      objectPath: record.transcriptDocUrl,
      fileName: `${record.institution} transcript`,
    });
  }
}
