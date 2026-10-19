import { db } from "@workspace/db";
import { uploadsTable } from "@workspace/db";
import { inArray } from "drizzle-orm";

export type UploadPurpose = "document" | "avatar";

/** Normalise `/objects/uploads/<id>` vs `objects/uploads/<id>` so lookups match either form. */
function candidates(objectPath: string): string[] {
  const trimmed = objectPath.trim();
  const withSlash = trimmed.startsWith("/") ? trimmed : `/${trimmed}`;
  return [withSlash, withSlash.slice(1)];
}

/** Record who was handed an upload slot. Called when a signed upload URL is issued. */
export async function registerUpload(params: {
  objectPath: string;
  uploaderUserId: number;
  purpose: UploadPurpose;
  originalName?: string;
  contentType?: string;
  sizeBytes?: number;
}): Promise<void> {
  await db
    .insert(uploadsTable)
    .values({
      objectPath: params.objectPath,
      uploaderUserId: params.uploaderUserId,
      purpose: params.purpose,
      originalName: params.originalName ?? null,
      contentType: params.contentType ?? null,
      sizeBytes: params.sizeBytes ?? null,
    })
    .onConflictDoNothing({ target: uploadsTable.objectPath });
}

/** Local-disk mode only: mark the slot as having received bytes. */
export async function markUploadCompleted(objectPath: string): Promise<void> {
  await db
    .update(uploadsTable)
    .set({ completedAt: new Date() })
    .where(inArray(uploadsTable.objectPath, candidates(objectPath)));
}

export type UploadOwnership = "owned" | "foreign" | "unknown";

/** Who owns this object according to the registry. */
export async function checkUploadOwnership(
  objectPath: string,
  userId: number,
): Promise<UploadOwnership> {
  const [row] = await db
    .select({ uploaderUserId: uploadsTable.uploaderUserId })
    .from(uploadsTable)
    .where(inArray(uploadsTable.objectPath, candidates(objectPath)))
    .limit(1);
  if (!row) return "unknown";
  return row.uploaderUserId === userId ? "owned" : "foreign";
}

export class UploadOwnershipError extends Error {
  readonly status: 400 | 403;

  constructor(ownership: Exclude<UploadOwnership, "owned">) {
    super(
      ownership === "foreign"
        ? "You can only attach files you uploaded yourself"
        : "Unknown upload — please upload the file again",
    );
    this.name = "UploadOwnershipError";
    this.status = ownership === "foreign" ? 403 : 400;
  }
}

/**
 * Throws unless `userId` is the registered uploader of `objectPath`. Use this
 * at every point where a client-supplied objectPath gets persisted.
 */
export async function assertUploadOwnedBy(objectPath: string, userId: number): Promise<void> {
  const ownership = await checkUploadOwnership(objectPath, userId);
  if (ownership !== "owned") throw new UploadOwnershipError(ownership);
}

/** True when the registry says `userId` uploaded this object (used by the read ACL). */
export async function isUploaderOf(objectPath: string, userId: number): Promise<boolean> {
  return (await checkUploadOwnership(objectPath, userId)) === "owned";
}

/**
 * Validate only the object paths that are *changing*. Values already stored on
 * the row are allowed through unchanged so legacy objects (uploaded before the
 * registry existed) don't block routine profile saves.
 */
export async function assertChangedPathsOwnedBy(
  userId: number,
  incoming: Record<string, string | null | undefined>,
  existing: Record<string, string | null | undefined>,
): Promise<void> {
  for (const [field, value] of Object.entries(incoming)) {
    if (!value?.trim()) continue;
    if (existing[field] && existing[field] === value) continue;
    await assertUploadOwnedBy(value, userId);
  }
}
