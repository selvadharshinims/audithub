import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { HttpError } from "./error.js";

export interface AuthPayload {
  userId: string;
  orgId: string;
  role: string;
  isPlatformAdmin?: boolean;
}

/** Gate for platform-level admin endpoints (the info@digitalvetri.com control panel). */
export function requirePlatformAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.auth) return next(new HttpError(401, "Unauthenticated"));
  if (!req.auth.isPlatformAdmin) return next(new HttpError(403, "Forbidden"));
  next();
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return next(new HttpError(401, "Missing bearer token"));
  }
  const token = header.slice("Bearer ".length);
  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET) as AuthPayload;
    req.auth = payload;
    next();
  } catch {
    next(new HttpError(401, "Invalid or expired token"));
  }
}
