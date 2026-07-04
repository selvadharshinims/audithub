import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { CompanyCreateSchema, CompanyUpdateSchema } from "@audithub/types";
import { HttpError } from "../../middleware/error.js";

/** Nested under /clients/:id/companies for list + create. */
export const clientCompaniesRouter = Router();
clientCompaniesRouter.use(requireAuth);

clientCompaniesRouter.get("/:id/companies", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!client) throw new HttpError(404, "Client not found");

    const rows = await prisma.company.findMany({
      where: { clientId: client.id },
      orderBy: { legalName: "asc" },
    });
    res.json(rows);
  } catch (err) {
    next(err);
  }
});

clientCompaniesRouter.post("/:id/companies", async (req, res, next) => {
  try {
    const input = CompanyCreateSchema.parse(req.body);

    const client = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!client) throw new HttpError(404, "Client not found");

    const created = await prisma.company.create({
      data: { ...input, clientId: client.id },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

/** Top-level for update + delete: /companies/:id. */
export const companiesRouter = Router();
companiesRouter.use(requireAuth);

companiesRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = CompanyUpdateSchema.parse(req.body);
    const existing = await prisma.company.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Company not found");

    const updated = await prisma.company.update({ where: { id: existing.id }, data: input });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

companiesRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.company.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Company not found");
    await prisma.company.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
