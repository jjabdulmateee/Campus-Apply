import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { Response } from "express";

const packageRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "..",
);

/** Root folder for uploaded blobs (avatars, transcripts, locker docs). */
export function getLocalUploadRoot(): string {
  const configured = process.env.LOCAL_UPLOAD_DIR?.trim();
  if (configured) {
    return path.isAbsolute(configured)
      ? configured
      : path.resolve(packageRoot, configured);
  }
  return path.join(packageRoot, "uploads");
}

export function isLocalStorageBackend(): boolean {
  if (process.env.STORAGE_BACKEND === "gcs") return false;
  if (process.env.STORAGE_BACKEND === "local") return true;
  // Default to local disk when Replit GCS env vars are absent.
  return !process.env.PRIVATE_OBJECT_DIR?.trim();
}

/** Map `/objects/uploads/<id>` → `<uploadRoot>/uploads/<id>` on disk. */
export function resolveLocalObjectPath(objectPath: string): string {
  const normalized = objectPath.startsWith("/") ? objectPath.slice(1) : objectPath;
  const relative = normalized.startsWith("objects/")
    ? normalized.slice("objects/".length)
    : normalized;
  return path.join(getLocalUploadRoot(), relative);
}

/** True when `candidate` resolves to a location inside the upload root. */
function isInsideUploadRoot(candidate: string): boolean {
  const root = path.resolve(getLocalUploadRoot());
  const resolved = path.resolve(candidate);
  return resolved === root || resolved.startsWith(root + path.sep);
}

const OBJECT_ID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidLocalObjectId(objectId: string): boolean {
  return OBJECT_ID_PATTERN.test(objectId);
}

export class LocalUploadError extends Error {
  readonly status: 403 | 404 | 409;

  constructor(message: string, status: 403 | 404 | 409) {
    super(message);
    this.name = "LocalUploadError";
    this.status = status;
  }
}

interface LocalObjectMeta {
  ownerUserId?: number;
  contentType?: string;
  createdAt?: string;
  uploadedAt?: string;
}

function metaPathFor(objectId: string): string {
  return path.join(getLocalUploadRoot(), "uploads", `${objectId}.meta.json`);
}

async function readMeta(objectId: string): Promise<LocalObjectMeta | null> {
  try {
    const raw = await fs.readFile(metaPathFor(objectId), "utf8");
    return JSON.parse(raw) as LocalObjectMeta;
  } catch {
    return null;
  }
}

/**
 * Reserve an upload slot for `ownerUserId`. The returned `uploadURL` only
 * accepts a PUT from that same user, exactly once.
 */
export async function prepareLocalUpload(ownerUserId: number): Promise<{
  uploadURL: string;
  objectPath: string;
  objectId: string;
}> {
  const objectId = randomUUID();
  const objectPath = `/objects/uploads/${objectId}`;
  const uploadURL = `/api/storage/uploads/direct/${objectId}`;
  await fs.mkdir(path.join(getLocalUploadRoot(), "uploads"), { recursive: true });
  const meta: LocalObjectMeta = {
    ownerUserId,
    createdAt: new Date().toISOString(),
  };
  await fs.writeFile(metaPathFor(objectId), JSON.stringify(meta));
  return { uploadURL, objectPath, objectId };
}

/**
 * Persist the bytes for a previously reserved slot. Throws `LocalUploadError`
 * when the slot is unknown, belongs to a different user, or was already used.
 */
export async function saveLocalUpload(
  objectId: string,
  data: Buffer,
  ownerUserId: number,
  contentType?: string,
): Promise<void> {
  if (!isValidLocalObjectId(objectId)) {
    throw new LocalUploadError("Invalid upload target", 404);
  }

  const meta = await readMeta(objectId);
  if (!meta || meta.ownerUserId === undefined) {
    throw new LocalUploadError("Unknown upload target — request a new upload URL", 404);
  }
  if (meta.ownerUserId !== ownerUserId) {
    throw new LocalUploadError("You do not own this upload target", 403);
  }

  const filePath = path.join(getLocalUploadRoot(), "uploads", objectId);
  try {
    await fs.access(filePath);
    throw new LocalUploadError("This upload target has already been used", 409);
  } catch (err) {
    if (err instanceof LocalUploadError) throw err;
    // ENOENT — slot is free, continue.
  }

  await fs.writeFile(filePath, data);
  const finalMeta: LocalObjectMeta = {
    ...meta,
    contentType: contentType ?? meta.contentType,
    uploadedAt: new Date().toISOString(),
  };
  await fs.writeFile(metaPathFor(objectId), JSON.stringify(finalMeta));
}

export async function serveLocalObject(
  objectPath: string,
  res: Response,
): Promise<boolean> {
  const filePath = resolveLocalObjectPath(objectPath);
  if (!isInsideUploadRoot(filePath)) return false;
  if (filePath.endsWith(".meta.json")) return false;

  try {
    const [data, metaRaw] = await Promise.all([
      fs.readFile(filePath),
      fs.readFile(`${filePath}.meta.json`, "utf8").catch(() => null),
    ]);
    let contentType = "application/octet-stream";
    if (metaRaw) {
      try {
        contentType =
          (JSON.parse(metaRaw) as LocalObjectMeta).contentType ?? contentType;
      } catch {
        // ignore malformed sidecar
      }
    }
    res.setHeader("Content-Type", contentType);
    res.setHeader("Cache-Control", "private, max-age=3600");
    res.send(data);
    return true;
  } catch {
    return false;
  }
}
