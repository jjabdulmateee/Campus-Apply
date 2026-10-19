import { db } from "@workspace/db";
import {
  documentsTable,
  studentProfilesTable,
  academicRecordsTable,
  usersTable,
  applicationsTable,
  counselorAssignmentsTable,
} from "@workspace/db";
import { and, eq, inArray, notInArray, or } from "drizzle-orm";
import type { AuthUser } from "../middleware/auth";
import { getAdminUniversityScope } from "./adminScope";
import { isUploaderOf } from "./uploadRegistry";

/**
 * Stored object paths are canonically `/objects/uploads/<id>`, but older rows
 * may have been saved without the leading slash. Match both forms.
 */
function objectPathCandidates(objectPath: string): string[] {
  const withSlash = objectPath.startsWith("/") ? objectPath : `/${objectPath}`;
  return [withSlash, withSlash.slice(1)];
}

/** Every studentId whose records reference this object (locker docs, profile docs, transcripts, photo). */
async function findOwningStudentIds(candidates: string[]): Promise<Set<string>> {
  const [docs, profiles, academics] = await Promise.all([
    db
      .select({ studentId: documentsTable.studentId })
      .from(documentsTable)
      .where(inArray(documentsTable.objectPath, candidates)),
    db
      .select({ studentId: studentProfilesTable.studentId })
      .from(studentProfilesTable)
      .where(
        or(
          inArray(studentProfilesTable.cnicDocumentUrl, candidates),
          inArray(studentProfilesTable.transcriptUrl, candidates),
          inArray(studentProfilesTable.photoUrl, candidates),
        ),
      ),
    db
      .select({ studentId: academicRecordsTable.studentId })
      .from(academicRecordsTable)
      .where(inArray(academicRecordsTable.transcriptDocUrl, candidates)),
  ]);

  return new Set([...docs, ...profiles, ...academics].map((r) => r.studentId));
}

async function isOwnAvatar(userId: number, candidates: string[]): Promise<boolean> {
  const [row] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(and(eq(usersTable.id, userId), inArray(usersTable.avatarUrl, candidates)))
    .limit(1);
  return !!row;
}

/**
 * Decides whether `user` may read the private object at `objectPath`.
 *
 * - Any user may read objects they uploaded (per the uploads registry) and
 *   their own avatar.
 * - Students may read objects referenced by their own records.
 * - Admins may read objects belonging to applicants who have a live (non-draft,
 *   non-withdrawn) application inside the admin's university scope — i.e. the
 *   same set that appears in their review queue.
 * - Counselors may read school reports they uploaded for an assigned student.
 */
export async function canAccessStoredObject(
  user: AuthUser,
  objectPath: string,
): Promise<boolean> {
  const candidates = objectPathCandidates(objectPath);

  if (await isUploaderOf(objectPath, user.userId)) return true;
  if (await isOwnAvatar(user.userId, candidates)) return true;

  if (user.role === "student") {
    if (!user.studentId) return false;
    const owners = await findOwningStudentIds(candidates);
    return owners.has(user.studentId);
  }

  if (user.role === "admin") {
    const owners = await findOwningStudentIds(candidates);
    if (owners.size === 0) return false;

    const scope = await getAdminUniversityScope(user.userId);
    const [match] = await db
      .select({ id: applicationsTable.id })
      .from(applicationsTable)
      .where(
        and(
          inArray(applicationsTable.studentId, [...owners]),
          notInArray(applicationsTable.status, ["draft", "withdrawn"]),
          scope !== undefined ? eq(applicationsTable.universityId, scope) : undefined,
        ),
      )
      .limit(1);
    return !!match;
  }

  if (user.role === "counselor") {
    const [match] = await db
      .select({ id: counselorAssignmentsTable.id })
      .from(counselorAssignmentsTable)
      .where(
        and(
          eq(counselorAssignmentsTable.counselorUserId, user.userId),
          inArray(counselorAssignmentsTable.schoolReportObjectPath, candidates),
        ),
      )
      .limit(1);
    return !!match;
  }

  return false;
}
