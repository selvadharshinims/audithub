import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { ReminderCreateSchema, ReminderUpdateSchema } from "@audithub/types";
import { HttpError } from "../../middleware/error.js";
import { sendReminderNow } from "../../jobs/reminders.js";

export const remindersRouter = Router();

remindersRouter.use(requireAuth);

remindersRouter.get("/", async (req, res, next) => {
  try {
    const { from, to } = req.query as { from?: string; to?: string };
    const where: {
      client: { orgId: string };
      dueDate?: { gte?: Date; lte?: Date };
    } = { client: { orgId: req.auth!.orgId } };

    if (from || to) {
      where.dueDate = {};
      if (from) where.dueDate.gte = new Date(from);
      if (to) where.dueDate.lte = new Date(to);
    }

    const reminders = await prisma.reminder.findMany({
      where,
      include: { client: { select: { id: true, name: true } } },
      orderBy: { dueDate: "asc" },
    });
    res.json(reminders);
  } catch (err) {
    next(err);
  }
});

remindersRouter.post("/", async (req, res, next) => {
  try {
    const input = ReminderCreateSchema.parse(req.body);

    const client = await prisma.client.findFirst({
      where: { id: input.clientId, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!client) throw new HttpError(404, "Client not found");

    const created = await prisma.reminder.create({ data: input });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

remindersRouter.get("/:id", async (req, res, next) => {
  try {
    const reminder = await prisma.reminder.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
      include: { client: { select: { id: true, name: true } } },
    });
    if (!reminder) throw new HttpError(404, "Reminder not found");
    res.json(reminder);
  } catch (err) {
    next(err);
  }
});

remindersRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = ReminderUpdateSchema.parse(req.body);

    const existing = await prisma.reminder.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Reminder not found");

    if (input.clientId) {
      const client = await prisma.client.findFirst({
        where: { id: input.clientId, orgId: req.auth!.orgId },
        select: { id: true },
      });
      if (!client) throw new HttpError(404, "Client not found");
    }

    const updated = await prisma.reminder.update({ where: { id: existing.id }, data: input });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

remindersRouter.post("/:id/send-now", async (req, res, next) => {
  try {
    const existing = await prisma.reminder.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Reminder not found");

    const result = await sendReminderNow(existing.id);
    if (!result.ok) throw new HttpError(500, result.error ?? "Dispatch failed");
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

remindersRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.reminder.findFirst({
      where: { id: req.params.id, client: { orgId: req.auth!.orgId } },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Reminder not found");
    await prisma.reminder.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
