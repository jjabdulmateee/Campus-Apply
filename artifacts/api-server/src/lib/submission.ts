import { db } from "@workspace/db";
import {
  applicationsTable,
  applicationSnapshotsTable,
  applicationAnswersTable,
  userCollegesTable,
  universitiesTable,
  programsTable,
  studentProfilesTable,
  academicRecordsTable,
  testScoresTable,
  activitiesTable,
  essaysTable,
  documentsTable,
  usersTable,
  type SnapshotRecord,
} from "@workspace/db";
import { getSupplementQuestions, countWords } from "@workspace/api-zod";
import { and, eq, ne } from "drizzle-orm";
import { sendApplicationSubmissionEmail } from "../utils/email";
import { syncProfileDocumentsToLocker } from "./documentLocker";
import { randomUUID } from "node:crypto";

/** Demo-mode application fee shown in the student checkout and stored on the receipt. */
export const SIMULATED_APPLICATION_FEE_PKR = 2000;

// ─── Types ────────────────────────────────────────────────────────────────────

export type SubmissionErrorCode = "NOT_FOUND" | "NOT_DRAFT" | "INCOMPLETE" | "NO_PROGRAM";

export class SubmissionError extends Error {
  readonly code: SubmissionErrorCode;
  readonly missing: string[];

  constructor(code: SubmissionErrorCode, message: string, missing: string[] = []) {
    super(message);
    this.name = "SubmissionError";
    this.code = code;
    this.missing = missing;
  }

  get httpStatus(): number {
    switch (this.code) {
      case "NOT_FOUND":
        return 404;
      case "NOT_DRAFT":
        return 409;
      case "INCOMPLETE":
      case "NO_PROGRAM":
        return 400;
    }
  }
}

type Profile = typeof studentProfilesTable.$inferSelect;
type Academic = typeof academicRecordsTable.$inferSelect;
type TestScore = typeof testScoresTable.$inferSelect;
type Activity = typeof activitiesTable.$inferSelect;
type Essay = typeof essaysTable.$inferSelect;
type Answer = typeof applicationAnswersTable.$inferSelect;
type Document = typeof documentsTable.$inferSelect;
type University = typeof universitiesTable.$inferSelect;
type Program = typeof programsTable.$inferSelect;
type Application = typeof applicationsTable.$inferSelect;

/** Everything a reviewer sees, as it exists right now. */
export interface SubmissionPacket {
  profile: Profile | null;
  academics: Academic[];
  tests: TestScore[];
  activities: Activity[];
  essays: Array<Essay & { wordCount: number }>;
  answers: Answer[];
  documents: Document[];
}

export interface ValidationResult {
  canSubmit: boolean;
  missing: string[];
}

// ─── Loading ──────────────────────────────────────────────────────────────────

export async function loadSubmissionPacket(
  studentId: string,
  applicationId?: number,
): Promise<SubmissionPacket> {
  const [profile, academics, tests, activities, essays, documents, answers] = await Promise.all([
    db.query.studentProfilesTable.findFirst({
      where: eq(studentProfilesTable.studentId, studentId),
    }),
    db.select().from(academicRecordsTable).where(eq(academicRecordsTable.studentId, studentId)),
    db.select().from(testScoresTable).where(eq(testScoresTable.studentId, studentId)),
    db.select().from(activitiesTable).where(eq(activitiesTable.studentId, studentId)),
    db.select().from(essaysTable).where(eq(essaysTable.studentId, studentId)),
    db.select().from(documentsTable).where(eq(documentsTable.studentId, studentId)),
    applicationId
      ? db
          .select()
          .from(applicationAnswersTable)
          .where(
            and(
              eq(applicationAnswersTable.applicationId, applicationId),
              eq(applicationAnswersTable.studentId, studentId),
            ),
          )
      : Promise.resolve([] as Answer[]),
  ]);

  return {
    profile: profile ?? null,
    academics,
    tests,
    activities,
    essays: essays.map((e) => ({ ...e, wordCount: countWords(e.content) })),
    answers,
    documents,
  };
}

// ─── Validation ───────────────────────────────────────────────────────────────

const IDENTITY_DOC_CATEGORIES = new Set(["cnic_front", "cnic_back", "b_form"]);
const TRANSCRIPT_DOC_CATEGORIES = new Set([
  "matric_marksheet",
  "fsc_transcript",
  "a_level_transcript",
  "o_level_transcript",
]);
export const MIN_PERSONAL_STATEMENT_WORDS = 250;

/**
 * The one server-side rule set for "is this application ready to submit".
 * Both student-facing validate endpoints and both submit endpoints use it,
 * so what the UI shows as missing is exactly what the server will enforce.
 */
export function validatePacket(
  packet: SubmissionPacket,
  university: Pick<University, "shortName" | "essayRequired"> | null | undefined,
): ValidationResult {
  const missing: string[] = [];
  const { profile, academics, tests, essays, documents, answers } = packet;

  // Essential profile data
  const profileFields: Array<[keyof Profile, string]> = [
    ["firstName", "first name"],
    ["lastName", "last name"],
    ["email", "email"],
    ["dateOfBirth", "date of birth"],
    ["phoneNumber", "phone number"],
    ["province", "province"],
    ["city", "city"],
  ];
  const missingProfile = profileFields
    .filter(([field]) => !String(profile?.[field] ?? "").trim())
    .map(([, label]) => label);
  if (!profile) {
    missing.push("Complete your personal profile");
  } else if (missingProfile.length > 0) {
    missing.push(`Complete your personal profile: ${missingProfile.join(", ")}`);
  }

  // Identity document (CNIC / B-Form)
  const hasIdentityDoc =
    documents.some((d) => IDENTITY_DOC_CATEGORIES.has(d.category)) ||
    !!profile?.cnicDocumentUrl?.trim();
  if (!hasIdentityDoc) {
    missing.push("Upload your CNIC or B-Form in the Document Locker");
  }

  // Academic transcript / marksheet
  const hasTranscript =
    documents.some((d) => TRANSCRIPT_DOC_CATEGORIES.has(d.category)) ||
    !!profile?.transcriptUrl?.trim() ||
    academics.some((a) => !!a.transcriptDocUrl?.trim());
  if (!hasTranscript) {
    missing.push("Upload an academic transcript or marksheet");
  }

  // Education + testing
  if (academics.length === 0) missing.push("Add at least one education record");
  if (tests.length === 0) missing.push("Add at least one test score (ECAT, MDCAT, SAT, IELTS, etc.)");

  // Personal statement
  const essayRequired = university?.essayRequired !== false;
  if (essayRequired) {
    const ps = essays.find((e) => e.type === "personal_statement");
    const words = ps?.wordCount ?? 0;
    if (words < MIN_PERSONAL_STATEMENT_WORDS) {
      missing.push(
        `Write a Personal Statement of at least ${MIN_PERSONAL_STATEMENT_WORDS} words — currently ${words} word${words === 1 ? "" : "s"}`,
      );
    }
  }

  // Required program supplements
  const answerByKey = new Map(answers.map((a) => [a.questionKey, a.answer ?? ""]));
  for (const q of getSupplementQuestions(university?.shortName)) {
    if (!q.required) continue;
    const answer = answerByKey.get(q.key)?.trim() ?? "";
    if (!answer) {
      missing.push(`Answer the supplement question: "${q.question.slice(0, 60)}…"`);
      continue;
    }
    if (countWords(answer) > q.maxWords) {
      missing.push(`Shorten your answer to "${q.question.slice(0, 40)}…" to ${q.maxWords} words or fewer`);
    }
  }

  return { canSubmit: missing.length === 0, missing };
}

// ─── Application resolution ───────────────────────────────────────────────────

async function pickDefaultProgramId(universityId: number): Promise<number> {
  const [program] = await db
    .select({ id: programsTable.id })
    .from(programsTable)
    .where(eq(programsTable.universityId, universityId))
    .limit(1);
  if (!program) {
    throw new SubmissionError(
      "NO_PROGRAM",
      "No program is configured for this university. Apply to a specific program first.",
    );
  }
  return program.id;
}

/**
 * Find the student's live (non-withdrawn) application for a university,
 * optionally narrowed to a program. Creates a draft if none exists so the
 * student has a place to answer supplements. This is what makes the
 * "My Colleges" watchlist and the program-specific application the same record.
 */
export async function ensureDraftApplication(params: {
  studentId: string;
  universityId: number;
  programId?: number;
}): Promise<Application> {
  const { studentId, universityId, programId } = params;

  const existing = await db.query.applicationsTable.findFirst({
    where: and(
      eq(applicationsTable.studentId, studentId),
      eq(applicationsTable.universityId, universityId),
      programId ? eq(applicationsTable.programId, programId) : undefined,
      ne(applicationsTable.status, "withdrawn"),
    ),
  });
  if (existing) return existing;

  const resolvedProgramId = programId ?? (await pickDefaultProgramId(universityId));
  const [created] = await db
    .insert(applicationsTable)
    .values({ studentId, universityId, programId: resolvedProgramId, status: "draft" })
    .returning();
  return created;
}

export async function getOwnedApplication(
  studentId: string,
  applicationId: number,
): Promise<Application> {
  const app = await db.query.applicationsTable.findFirst({
    where: and(
      eq(applicationsTable.id, applicationId),
      eq(applicationsTable.studentId, studentId),
    ),
  });
  if (!app) throw new SubmissionError("NOT_FOUND", "Application not found");
  return app;
}

// ─── Validate (read-only) ─────────────────────────────────────────────────────

export async function validateApplication(
  studentId: string,
  application: Application,
): Promise<{
  validation: ValidationResult;
  packet: SubmissionPacket;
  university: University | null;
  program: Program | null;
}> {
  const [packet, university, program] = await Promise.all([
    loadSubmissionPacket(studentId, application.id),
    db.query.universitiesTable.findFirst({
      where: eq(universitiesTable.id, application.universityId),
    }),
    db.query.programsTable.findFirst({
      where: eq(programsTable.id, application.programId),
    }),
  ]);
  return {
    validation: validatePacket(packet, university),
    packet,
    university: university ?? null,
    program: program ?? null,
  };
}

// ─── Submit ───────────────────────────────────────────────────────────────────

function toRecord<T extends object>(row: T): SnapshotRecord {
  return JSON.parse(JSON.stringify(row)) as SnapshotRecord;
}

export interface SubmitResult {
  application: Application;
  universityName: string;
  programName: string;
  paymentTransactionRef: string | null;
  paymentAmountPkr: number | null;
}

/**
 * Canonical submission. Validates, flips `draft → submitted` atomically,
 * freezes an immutable snapshot of the packet, and mirrors the state onto the
 * `user_colleges` watchlist row. Throws `SubmissionError` on any failure.
 */
export async function submitApplication(params: {
  studentId: string;
  application: Application;
  signature?: string;
  paymentSimulated?: boolean;
}): Promise<SubmitResult> {
  const { studentId, application, signature } = params;

  if (application.status !== "draft") {
    throw new SubmissionError(
      "NOT_DRAFT",
      "Only draft applications can be submitted",
    );
  }

  // Profile / education uploads live on the student row — copy them into the
  // documents table so reviewers see them in the Admin Application Detail queue.
  await syncProfileDocumentsToLocker(studentId);

  const { validation, packet, university, program } = await validateApplication(
    studentId,
    application,
  );
  if (!validation.canSubmit) {
    throw new SubmissionError("INCOMPLETE", "Application incomplete", validation.missing);
  }

  const submittedAt = new Date();
  const feeRequired = university?.applicationFeeRequired !== false;
  const paymentAmountPkr = feeRequired ? SIMULATED_APPLICATION_FEE_PKR : null;
  const paymentTransactionRef = feeRequired
    ? `CA-SIM-${submittedAt.toISOString().slice(0, 10).replace(/-/g, "")}-${randomUUID().slice(0, 8).toUpperCase()}`
    : null;

  const updated = await db.transaction(async (tx) => {
    // Status predicate makes this safe against a concurrent submit.
    const [row] = await tx
      .update(applicationsTable)
      .set({
        status: "submitted",
        submittedAt,
        updatedAt: submittedAt,
        paymentTransactionRef,
        paymentAmountPkr,
        paymentSimulatedAt: paymentTransactionRef ? submittedAt : null,
      })
      .where(
        and(
          eq(applicationsTable.id, application.id),
          eq(applicationsTable.studentId, studentId),
          eq(applicationsTable.status, "draft"),
        ),
      )
      .returning();
    if (!row) {
      throw new SubmissionError("NOT_DRAFT", "Application was already submitted");
    }

    // Immutable packet — never updated after this insert.
    await tx
      .insert(applicationSnapshotsTable)
      .values({
        applicationId: row.id,
        studentId,
        universityId: row.universityId,
        programId: row.programId,
        version: 1,
        signature: signature ?? null,
        profile: packet.profile ? toRecord(packet.profile) : null,
        academics: packet.academics.map(toRecord),
        tests: packet.tests.map(toRecord),
        activities: packet.activities.map(toRecord),
        essays: packet.essays.map(toRecord),
        answers: packet.answers.map(toRecord),
        documents: packet.documents.map(toRecord),
        submittedAt,
      })
      .onConflictDoNothing({ target: applicationSnapshotsTable.applicationId });

    // Mirror onto the watchlist row so "My Colleges" and the admin queue agree.
    const [college] = await tx
      .select({ id: userCollegesTable.id })
      .from(userCollegesTable)
      .where(
        and(
          eq(userCollegesTable.studentId, studentId),
          eq(userCollegesTable.universityId, row.universityId),
        ),
      )
      .limit(1);

    const collegePatch = {
      status: "submitted",
      submittedAt,
      updatedAt: submittedAt,
      signature: signature ?? null,
      payload: JSON.stringify({ applicationId: row.id, snapshotAt: submittedAt.toISOString() }),
    };
    if (college) {
      await tx.update(userCollegesTable).set(collegePatch).where(eq(userCollegesTable.id, college.id));
    } else {
      await tx.insert(userCollegesTable).values({
        studentId,
        universityId: row.universityId,
        ...collegePatch,
      });
    }

    return row;
  });

  const universityName = university?.name ?? "University";
  const programName = program?.name ?? "Program";

  const studentUser = await db.query.usersTable.findFirst({
    where: eq(usersTable.studentId, studentId),
  });
  if (studentUser?.email) {
    const profileName = packet.profile
      ? [packet.profile.firstName, packet.profile.lastName].filter(Boolean).join(" ")
      : "";
    sendApplicationSubmissionEmail({
      to: studentUser.email,
      fullName: profileName || studentUser.fullName,
      universityName,
      programName,
    }).catch(() => {});
  }

  return {
    application: updated,
    universityName,
    programName,
    paymentTransactionRef: updated.paymentTransactionRef ?? paymentTransactionRef,
    paymentAmountPkr: updated.paymentAmountPkr ?? paymentAmountPkr,
  };
}

// ─── Snapshot read ────────────────────────────────────────────────────────────

export async function getApplicationSnapshot(applicationId: number) {
  return db.query.applicationSnapshotsTable.findFirst({
    where: eq(applicationSnapshotsTable.applicationId, applicationId),
  });
}
