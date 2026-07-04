import type { Request, Response, NextFunction } from "express";
import { HttpError } from "./error.js";

export function requireRole(...allowed: string[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const role = req.auth?.role;
    if (!role) return next(new HttpError(401, "Unauthenticated"));
    if (role === "super_admin" || allowed.includes(role)) return next();
    next(new HttpError(403, "Forbidden"));
  };
}
