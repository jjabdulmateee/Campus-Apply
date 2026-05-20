import { db } from "@workspace/db";
import {
  applicationsTable,
  userCollegesTable,
  programsTable,
} from "@workspace/db";
import { and, eq } from "drizzle-orm";

export class ApplicationSyncError extends Error {
  readonly code: string;

  constructor(message: string, code: string) {
    super(message);
    this.name = "ApplicationSyncError";
    this.code = code;
  }
}

async function resolveProgramId(
  studentId: string,
  universityId: number,
  programId?: number,
): Promise<number> {
  if (programId) return programId;

  const [existingApp] = await db
    .select({ programId: applicationsTable.programId })
    .from(applicationsTable)
    .where(
      and(
        eq(applicationsTable.studentId, studentId),
        eq(applicationsTable.universityId, universityId),
      ),
    )
    .limit(1);

  if (existingApp) return existingApp.programId;

  const [program] = await db
    .select({ id: programsTable.id })
    .from(programsTable)
    .where(eq(programsTable.universityId, universityId))
    .limit(1);

  if (!program) {
    throw new ApplicationSyncError(
      "No program is configured for this university. Apply to a specific program first.",
      "NO_PROGRAM",
    );
  }

  return program.id;
}

export async function upsertSubmittedApplication(params: {
  studentId: string;
  universityId: number;
  programId?: number;
  submittedAt?: Date;
}): Promise<{ applicationId: number; programId: number }> {
  const submittedAt = params.submittedAt ?? new Date();
  const programId = await resolveProgramId(
    params.studentId,
    params.universityId,
    params.programId,
  );

  const [existing] = await db
    .select()
    .from(applicationsTable)
    .where(
      and(
        eq(applicationsTable.studentId, params.studentId),
        eq(applicationsTable.universityId, params.universityId),
        eq(applicationsTable.programId, programId),
      ),
    )
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(applicationsTable)
      .set({
        status: "submitted",
        submittedAt,
        updatedAt: submittedAt,
      })
      .where(eq(applicationsTable.id, existing.id))
      .returning();
    return { applicationId: updated.id, programId };
  }

  const [inserted] = await db
    .insert(applicationsTable)
    .values({
      studentId: params.studentId,
      universityId: params.universityId,
      programId,
      status: "submitted",
      submittedAt,
      updatedAt: submittedAt,
    })
    .returning();

  return { applicationId: inserted.id, programId };
}

export async function syncUserCollegeSubmitted(params: {
  studentId: string;
  universityId: number;
  submittedAt?: Date;
  payload?: string;
  signature?: string;
}): Promise<void> {
  const submittedAt = params.submittedAt ?? new Date();
  const [existing] = await db
    .select()
    .from(userCollegesTable)
    .where(
      and(
        eq(userCollegesTable.studentId, params.studentId),
        eq(userCollegesTable.universityId, params.universityId),
      ),
    )
    .limit(1);

  const patch: {
    status: string;
    submittedAt: Date;
    updatedAt: Date;
    payload?: string;
    signature?: string;
  } = {
    status: "submitted",
    submittedAt,
    updatedAt: submittedAt,
  };

  if (params.payload !== undefined) patch.payload = params.payload;
  if (params.signature !== undefined) patch.signature = params.signature;

  if (existing) {
    await db
      .update(userCollegesTable)
      .set(patch)
      .where(eq(userCollegesTable.id, existing.id));
    return;
  }

  await db.insert(userCollegesTable).values({
    studentId: params.studentId,
    universityId: params.universityId,
    ...patch,
  });
}

/** Keeps the canonical applications row and user_colleges row aligned on submit. */
export async function submitApplicationBundle(params: {
  studentId: string;
  universityId: number;
  programId?: number;
  submittedAt?: Date;
  collegePayload?: string;
  collegeSignature?: string;
}): Promise<{ applicationId: number; programId: number }> {
  const submittedAt = params.submittedAt ?? new Date();
  const result = await upsertSubmittedApplication({
    studentId: params.studentId,
    universityId: params.universityId,
    programId: params.programId,
    submittedAt,
  });

  await syncUserCollegeSubmitted({
    studentId: params.studentId,
    universityId: params.universityId,
    submittedAt,
    payload: params.collegePayload,
    signature: params.collegeSignature,
  });

  return result;
}
