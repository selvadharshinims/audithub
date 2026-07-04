import type { Request, Response, NextFunction } from "express";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";

export function audit(action: string, entity: string) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (req.auth) {
        await prisma.activityLog.create({
          data: {
            orgId: req.auth.orgId,
            actorId: req.auth.userId,
            action,
            entity,
            entityId: req.params.id ?? null,
            meta: { path: req.path, method: req.method },
          },
        });
      }
    } catch (err) {
      logger.warn({ err }, "audit log write failed");
    }
    next();
  };
}
