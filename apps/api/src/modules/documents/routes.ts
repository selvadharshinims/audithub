import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { storage } from "../../lib/storage.js";
import { HttpError } from "../../middleware/error.js";
import { DocumentCreateSchema } from "@audithub/types";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20 MB
});

const ALLOWED_MIME = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  "text/plain",
]);

/** Nested under /clients: list + upload per-client. Mounted at /clients. */
export const clientDocumentsRouter = Router();
clientDocumentsRouter.use(requireAuth);

clientDocumentsRouter.get("/:id/documents", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!client) throw new HttpError(404, "Client not found");

    const docs = await prisma.document.findMany({
      where: { clientId: client.id },
      include: { uploader: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
    res.json(docs);
  } catch (err) {
    next(err);
  }
});

clientDocumentsRouter.post("/:id/documents", upload.single("file"), async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true, orgId: true },
    });
    if (!client) throw new HttpError(404, "Client not found");
    if (!req.file) throw new HttpError(400, "No file uploaded (field must be 'file')");
    if (req.file.mimetype && !ALLOWED_MIME.has(req.file.mimetype)) {
      throw new HttpError(415, `Unsupported file type: ${req.file.mimetype}`);
    }

    const input = DocumentCreateSchema.parse({
      type: req.body?.type,
      name: req.body?.name,
    });

    const stored = await storage.save({
      orgId: client.orgId,
      clientId: client.id,
      originalName: req.file.originalname,
      mimeType: req.file.mimetype ?? null,
      buffer: req.file.buffer,
    });

    const created = await prisma.document.create({
      data: {
        clientId: client.id,
        uploadedBy: req.auth!.userId,
        type: input.type,
        name: input.name ?? req.file.originalname,
        url: stored.key,
        size: stored.size,
        mimeType: stored.mimeType,
      },
      include: { uploader: { select: { id: true, name: true } } },
    });

    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/** Top-level document ops: download + delete. Mounted at /documents. */
export const documentsRouter = Router();
documentsRouter.use(requireAuth);

documentsRouter.get("/:id/download", async (req, res, next) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
    });
    if (!doc) throw new HttpError(404, "Document not found");

    const stream = await storage.stream(doc.url);
    if (doc.mimeType) res.type(doc.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.name)}"`);
    stream.pipe(res);
  } catch (err) {
    next(err);
  }
});

documentsRouter.delete("/:id", async (req, res, next) => {
  try {
    const doc = await prisma.document.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
    });
    if (!doc) throw new HttpError(404, "Document not found");

    await storage.remove(doc.url).catch(() => undefined);
    await prisma.document.delete({ where: { id: doc.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
