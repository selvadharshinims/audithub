import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { Prisma } from "@prisma/client";
import { logger } from "../lib/logger.js";

export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message);
  }
}

export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ZodError) {
    return res.status(400).json({ error: "ValidationError", details: err.flatten() });
  }
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: err.message, details: err.details });
  }
  // Map common Prisma errors to sensible status codes instead of a blanket 500.
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === "P2002")
      return res.status(409).json({ error: "That value is already in use.", details: err.meta });
    if (err.code === "P2025") return res.status(404).json({ error: "Not found." });
    if (err.code === "P2003")
      return res.status(400).json({ error: "Referenced record does not exist." });
  }
  logger.error({ err }, "unhandled error");
  return res.status(500).json({ error: "InternalServerError" });
};
