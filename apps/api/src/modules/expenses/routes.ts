import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { ExpenseCreateSchema, ExpenseUpdateSchema } from "@audithub/types";
import { HttpError } from "../../middleware/error.js";

export const expensesRouter = Router();

expensesRouter.use(requireAuth);

expensesRouter.get("/", async (req, res, next) => {
  try {
    const { from, to, category } = req.query as { from?: string; to?: string; category?: string };
    const where: {
      orgId: string;
      category?: string;
      date?: { gte?: Date; lte?: Date };
    } = { orgId: req.auth!.orgId };
    if (category) where.category = category;
    if (from || to) {
      where.date = {};
      if (from) where.date.gte = new Date(from);
      if (to) where.date.lte = new Date(to);
    }

    const [rows, categories] = await Promise.all([
      prisma.expense.findMany({ where, orderBy: { date: "desc" } }),
      prisma.expense.findMany({
        where: { orgId: req.auth!.orgId },
        select: { category: true },
        distinct: ["category"],
        orderBy: { category: "asc" },
      }),
    ]);

    res.json({ rows, categories: categories.map((r) => r.category) });
  } catch (err) {
    next(err);
  }
});

expensesRouter.post("/", async (req, res, next) => {
  try {
    const input = ExpenseCreateSchema.parse(req.body);
    const created = await prisma.expense.create({
      data: { ...input, orgId: req.auth!.orgId },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

expensesRouter.patch("/:id", async (req, res, next) => {
  try {
    const input = ExpenseUpdateSchema.parse(req.body);
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Expense not found");

    const updated = await prisma.expense.update({ where: { id: existing.id }, data: input });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});

expensesRouter.delete("/:id", async (req, res, next) => {
  try {
    const existing = await prisma.expense.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "Expense not found");
    await prisma.expense.delete({ where: { id: existing.id } });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
