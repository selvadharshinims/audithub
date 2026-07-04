import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { ClientCreateSchema } from "@audithub/types";
import { prisma } from "../../lib/prisma.js";

export const clientsRouter = Router();

clientsRouter.use(requireAuth);

clientsRouter.get("/", async (req, res, next) => {
  try {
    const clients = await prisma.client.findMany({
      where: { orgId: req.auth!.orgId },
      orderBy: { createdAt: "desc" },
    });
    res.json(clients);
  } catch (err) {
    next(err);
  }
});

clientsRouter.post("/", async (req, res, next) => {
  try {
    const input = ClientCreateSchema.parse(req.body);
    const created = await prisma.client.create({
      data: { ...input, orgId: req.auth!.orgId },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

clientsRouter.get("/:id", async (req, res, next) => {
  try {
    const client = await prisma.client.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      include: { companies: true, documents: true },
    });
    if (!client) return res.status(404).json({ error: "Not found" });
    res.json(client);
  } catch (err) {
    next(err);
  }
});

clientsRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = ClientCreateSchema.partial().parse(req.body);
    const updated = await prisma.client.update({ where: { id: req.params.id }, data: input });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

clientsRouter.delete("/:id", async (req, res, next) => {
  try {
    await prisma.client.delete({ where: { id: req.params.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
