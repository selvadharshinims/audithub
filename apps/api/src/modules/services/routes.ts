import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { prisma } from "../../lib/prisma.js";
import { ServiceCreateSchema, ServiceUpdateSchema } from "@audithub/types";
import { HttpError } from "../../middleware/error.js";

export const servicesRouter = Router();

servicesRouter.use(requireAuth);

servicesRouter.get("/", async (req, res, next) => {
  try {
    const services = await prisma.service.findMany({
      where: { orgId: req.auth!.orgId },
      orderBy: { name: "asc" },
    });
    res.json(services);
  } catch (err) {
    next(err);
  }
});

servicesRouter.post("/", requireRole("super_admin", "auditor"), async (req, res, next) => {
  try {
    const input = ServiceCreateSchema.parse(req.body);
    const created = await prisma.service.create({
      data: { ...input, orgId: req.auth!.orgId },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

servicesRouter.patch("/:id", requireRole("super_admin", "auditor"), async (req, res, next) => {
  try {
    const input = ServiceUpdateSchema.parse(req.body);
    const existing = await prisma.service.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Service not found");
    const updated = await prisma.service.update({ where: { id: existing.id }, data: input });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

servicesRouter.delete("/:id", requireRole("super_admin", "auditor"), async (req, res, next) => {
  try {
    const existing = await prisma.service.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Service not found");
    await prisma.service.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
