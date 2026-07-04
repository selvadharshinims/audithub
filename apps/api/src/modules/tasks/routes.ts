import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { TaskCreateSchema, TaskUpdateSchema } from "@audithub/types";
import { HttpError } from "../../middleware/error.js";

export const tasksRouter = Router();

tasksRouter.use(requireAuth);

const orgScope = (orgId: string) => ({
  OR: [
    { client: { orgId } },
    { assignee: { orgId } },
    { AND: [{ clientId: null }, { assigneeId: null }] },
  ],
});

tasksRouter.get("/", async (req, res, next) => {
  try {
    const tasks = await prisma.task.findMany({
      where: orgScope(req.auth!.orgId),
      include: {
        client: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    });
    res.json(tasks);
  } catch (err) {
    next(err);
  }
});

tasksRouter.post("/", async (req, res, next) => {
  try {
    const input = TaskCreateSchema.parse(req.body);

    if (input.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: input.clientId, orgId: req.auth!.orgId },
        select: { id: true },
      });
      if (!client) throw new HttpError(404, "Client not found");
    }
    if (input.assigneeId) {
      const user = await prisma.user.findFirst({
        where: { id: input.assigneeId, orgId: req.auth!.orgId },
        select: { id: true },
      });
      if (!user) throw new HttpError(404, "Assignee not found");
    }

    const created = await prisma.task.create({ data: input });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

tasksRouter.get("/:id", async (req, res, next) => {
  try {
    const task = await prisma.task.findFirst({
      where: { id: req.params.id, ...orgScope(req.auth!.orgId) },
      include: {
        client: { select: { id: true, name: true } },
        assignee: { select: { id: true, name: true } },
      },
    });
    if (!task) throw new HttpError(404, "Task not found");
    res.json(task);
  } catch (err) {
    next(err);
  }
});

tasksRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = TaskUpdateSchema.parse(req.body);

    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, ...orgScope(req.auth!.orgId) },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Task not found");

    const updated = await prisma.task.update({ where: { id: existing.id }, data: input });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

tasksRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.task.findFirst({
      where: { id: req.params.id, ...orgScope(req.auth!.orgId) },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Task not found");
    await prisma.task.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
