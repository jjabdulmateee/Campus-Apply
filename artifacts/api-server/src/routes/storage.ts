import { Router, type IRouter, type Request, type Response } from "express";
import express from "express";
import { Readable } from "stream";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { ObjectStorageService, ObjectNotFoundError } from "../lib/objectStorage";
import {
  isLocalStorageBackend,
  isValidLocalObjectId,
  prepareLocalUpload,
  saveLocalUpload,
  serveLocalObject,
  LocalUploadError,
} from "../lib/localDiskStorage";
import { verifyJWT } from "../middleware/auth";
import { canAccessStoredObject } from "../lib/storageAccess";
import { registerUpload, markUploadCompleted } from "../lib/uploadRegistry";

const router: IRouter = Router();
const gcsStorage = new ObjectStorageService();

const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const MAX_SIZE_BYTES = 2 * 1024 * 1024;

/** Issue an upload target. Requires a signed-in user; the slot is bound to them. */
router.post("/storage/uploads/request-url", verifyJWT, async (req: Request, res: Response) => {
  const parsed = RequestUploadUrlBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Missing or invalid required fields" });
    return;
  }

  const { name, size, contentType } = parsed.data;

  if (!ALLOWED_MIME_TYPES.includes(contentType)) {
    res.status(400).json({ error: "Only PDF, JPG, PNG, and WebP files are allowed" });
    return;
  }

  if (size > MAX_SIZE_BYTES) {
    res.status(400).json({ error: "File size must not exceed 2MB" });
    return;
  }

  try {
    const uploaderUserId = req.user!.userId;

    if (isLocalStorageBackend()) {
      const { uploadURL, objectPath } = await prepareLocalUpload(uploaderUserId);
      await registerUpload({
        objectPath,
        uploaderUserId,
        purpose: "document",
        originalName: name,
        contentType,
        sizeBytes: size,
      });
      res.json(
        RequestUploadUrlResponse.parse({
          uploadURL,
          objectPath,
          metadata: { name, size, contentType },
        }),
      );
      return;
    }

    const uploadURL = await gcsStorage.getObjectEntityUploadURL();
    const objectPath = gcsStorage.normalizeObjectEntityPath(uploadURL);
    await registerUpload({
      objectPath,
      uploaderUserId,
      purpose: "document",
      originalName: name,
      contentType,
      sizeBytes: size,
    });

    res.json(
      RequestUploadUrlResponse.parse({
        uploadURL,
        objectPath,
        metadata: { name, size, contentType },
      }),
    );
  } catch (error) {
    req.log.error({ err: error }, "Error generating upload URL");
    res.status(500).json({ error: "Failed to generate upload URL" });
  }
});

/**
 * Local-dev PUT target for the signed-URL upload flow. Only the user who
 * requested the slot may write to it, and only once.
 */
router.put(
  "/storage/uploads/direct/:objectId",
  verifyJWT,
  express.raw({ type: "*/*", limit: MAX_SIZE_BYTES }),
  async (req: Request, res: Response) => {
    if (!isLocalStorageBackend()) {
      res.status(404).json({ error: "Direct upload is only available in local storage mode" });
      return;
    }

    const objectId = req.params.objectId;
    if (!objectId || Array.isArray(objectId) || !isValidLocalObjectId(objectId)) {
      res.status(400).json({ error: "Invalid object id" });
      return;
    }

    const body = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) {
      res.status(400).json({ error: "Empty upload body" });
      return;
    }

    if (body.length > MAX_SIZE_BYTES) {
      res.status(400).json({ error: "File size must not exceed 2MB" });
      return;
    }

    try {
      await saveLocalUpload(
        objectId,
        body,
        req.user!.userId,
        typeof req.headers["content-type"] === "string"
          ? req.headers["content-type"]
          : undefined,
      );
      await markUploadCompleted(`/objects/uploads/${objectId}`);
      res.status(200).send();
    } catch (error) {
      if (error instanceof LocalUploadError) {
        res.status(error.status).json({ error: error.message });
        return;
      }
      req.log.error({ err: error }, "Error saving local upload");
      res.status(500).json({ error: "Failed to save upload" });
    }
  },
);

/**
 * Public bucket objects (GCS only). Local disk mode has no public bucket —
 * every local upload is private and must go through `/storage/objects/*`.
 */
router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  if (isLocalStorageBackend()) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  try {
    const raw = req.params.filePath;
    const filePath = Array.isArray(raw) ? raw.join("/") : raw;
    const file = await gcsStorage.searchPublicObject(filePath);
    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    const response = await gcsStorage.downloadObject(file);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    req.log.error({ err: error }, "Error serving public object");
    res.status(500).json({ error: "Failed to serve public object" });
  }
});

/** Private objects: requires a session and an ownership / review-queue match. */
router.get("/storage/objects/*path", verifyJWT, async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;

    const segments = wildcardPath.split("/");
    if (segments.some((s) => s === "" || s === "." || s === "..")) {
      res.status(400).json({ error: "Invalid object path" });
      return;
    }

    const objectPath = `/objects/${wildcardPath}`;

    if (!(await canAccessStoredObject(req.user!, objectPath))) {
      res.status(403).json({ error: "You do not have access to this file" });
      return;
    }

    if (isLocalStorageBackend()) {
      const served = await serveLocalObject(objectPath, res);
      if (!served) res.status(404).json({ error: "Object not found" });
      return;
    }

    const objectFile = await gcsStorage.getObjectEntityFile(objectPath);
    const response = await gcsStorage.downloadObject(objectFile);

    res.status(response.status);
    response.headers.forEach((value, key) => res.setHeader(key, value));

    if (response.body) {
      const nodeStream = Readable.fromWeb(response.body as ReadableStream<Uint8Array>);
      nodeStream.pipe(res);
    } else {
      res.end();
    }
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      req.log.warn({ err: error }, "Object not found");
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Error serving object");
    res.status(500).json({ error: "Failed to serve object" });
  }
});

export default router;
