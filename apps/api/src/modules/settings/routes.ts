import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { prisma } from "../../lib/prisma.js";
import { OrgUpdateSchema } from "@audithub/types";
import { sendDigestForOrg } from "../../jobs/digests.js";
import { assertValidPngDataUrl } from "../../lib/image-validate.js";
import { HttpError } from "../../middleware/error.js";

export const settingsRouter = Router();

settingsRouter.use(requireAuth);

settingsRouter.get("/", async (req, res, next) => {
  try {
    const org = await prisma.organization.findUnique({ where: { id: req.auth!.orgId } });
    res.json(org);
  } catch (err) {
    next(err);
  }
});

settingsRouter.patch("/", requireRole("super_admin"), async (req, res, next) => {
  try {
    const input = OrgUpdateSchema.parse(req.body);
    // Decode-validate the logo before it can ever reach pdfkit (async PNG decode
    // errors crash the process, so a bad image must never be stored).
    if (typeof input.logo === "string") {
      try {
        assertValidPngDataUrl(input.logo);
      } catch (e) {
        throw new HttpError(400, e instanceof Error ? e.message : "Invalid logo image");
      }
    }
    const org = await prisma.organization.update({
      where: { id: req.auth!.orgId },
      data: input,
    });
    res.json(org);
  } catch (err) {
    next(err);
  }
});

settingsRouter.get("/roles", async (_req, res, next) => {
  try {
    const roles = await prisma.role.findMany({
      select: { id: true, name: true, permissions: true },
      orderBy: { name: "asc" },
    });
    res.json(roles);
  } catch (err) {
    next(err);
  }
});

settingsRouter.post("/send-digest-now", requireRole("super_admin"), async (req, res, next) => {
  try {
    const result = await sendDigestForOrg(req.auth!.orgId);
    res.json({ ok: true, ...result });
  } catch (err) {
    next(err);
  }
});

settingsRouter.get("/activity-logs", requireRole("super_admin"), async (req, res, next) => {
  try {
    const { entity, actorId, from, to } = req.query as {
      entity?: string;
      actorId?: string;
      from?: string;
      to?: string;
    };
    const limit = Math.min(500, Math.max(1, Number(req.query.limit ?? 100)));

    const where: {
      orgId: string;
      entity?: string;
      actorId?: string;
      createdAt?: { gte?: Date; lte?: Date };
    } = { orgId: req.auth!.orgId };

    if (entity) where.entity = entity;
    if (actorId) where.actorId = actorId;
    if (from || to) {
      where.createdAt = {};
      if (from) where.createdAt.gte = new Date(from);
      if (to) where.createdAt.lte = new Date(to);
    }

    const [rows, distinctEntities] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { actor: { select: { id: true, name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.activityLog.findMany({
        where: { orgId: req.auth!.orgId },
        select: { entity: true },
        distinct: ["entity"],
        orderBy: { entity: "asc" },
      }),
    ]);

    res.json({
      rows,
      entities: distinctEntities.map((r) => r.entity),
    });
  } catch (err) {
    next(err);
  }
});
