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
  prepareLocalUpload,
  saveLocalUpload,
  serveLocalObject,
  getLocalUploadRoot,
} from "../lib/localDiskStorage";

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

router.post("/storage/uploads/request-url", async (req: Request, res: Response) => {
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
    if (isLocalStorageBackend()) {
      const { uploadURL, objectPath } = await prepareLocalUpload();
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

/** Local-dev PUT target for the signed-URL upload flow (frontend PUTs the raw file here). */
router.put(
  "/storage/uploads/direct/:objectId",
  express.raw({ type: "*/*", limit: MAX_SIZE_BYTES }),
  async (req: Request, res: Response) => {
    if (!isLocalStorageBackend()) {
      res.status(404).json({ error: "Direct upload is only available in local storage mode" });
      return;
    }

    const objectId = req.params.objectId;
    if (!objectId || Array.isArray(objectId)) {
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
        typeof req.headers["content-type"] === "string"
          ? req.headers["content-type"]
          : undefined,
      );
      res.status(200).send();
    } catch (error) {
      req.log.error({ err: error }, "Error saving local upload");
      res.status(500).json({ error: "Failed to save upload" });
    }
  },
);

router.get("/storage/public-objects/*filePath", async (req: Request, res: Response) => {
  try {
    if (isLocalStorageBackend()) {
      const raw = req.params.filePath;
      const filePath = Array.isArray(raw) ? raw.join("/") : raw;
      const served = await serveLocalObject(`/objects/${filePath}`, res);
      if (!served) res.status(404).json({ error: "File not found" });
      return;
    }

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

router.get("/storage/objects/*path", async (req: Request, res: Response) => {
  try {
    const raw = req.params.path;
    const wildcardPath = Array.isArray(raw) ? raw.join("/") : raw;
    const objectPath = `/objects/${wildcardPath}`;

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

export { getLocalUploadRoot };
export default router;
