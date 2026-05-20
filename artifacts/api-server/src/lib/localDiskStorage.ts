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

export async function prepareLocalUpload(): Promise<{
  uploadURL: string;
  objectPath: string;
  objectId: string;
}> {
  const objectId = randomUUID();
  const objectPath = `/objects/uploads/${objectId}`;
  const uploadURL = `/api/storage/uploads/direct/${objectId}`;
  await fs.mkdir(path.join(getLocalUploadRoot(), "uploads"), { recursive: true });
  return { uploadURL, objectPath, objectId };
}

export async function saveLocalUpload(
  objectId: string,
  data: Buffer,
  contentType?: string,
): Promise<void> {
  const filePath = path.join(getLocalUploadRoot(), "uploads", objectId);
  await fs.writeFile(filePath, data);
  if (contentType) {
    await fs.writeFile(`${filePath}.meta.json`, JSON.stringify({ contentType }));
  }
}

export async function serveLocalObject(
  objectPath: string,
  res: Response,
): Promise<boolean> {
  const filePath = resolveLocalObjectPath(objectPath);
  try {
    const [data, metaRaw] = await Promise.all([
      fs.readFile(filePath),
      fs.readFile(`${filePath}.meta.json`, "utf8").catch(() => null),
    ]);
    let contentType = "application/octet-stream";
    if (metaRaw) {
      try {
        contentType =
          (JSON.parse(metaRaw) as { contentType?: string }).contentType ??
          contentType;
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
