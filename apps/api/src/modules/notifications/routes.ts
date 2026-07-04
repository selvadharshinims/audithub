import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";

export const notificationsRouter = Router();

notificationsRouter.use(requireAuth);

notificationsRouter.get("/", async (req, res, next) => {
  try {
    const items = await prisma.notification.findMany({
      where: { userId: req.auth!.userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(items);
  } catch (err) {
    next(err);
  }
});

notificationsRouter.get("/unread-count", async (req, res, next) => {
  try {
    const count = await prisma.notification.count({
      where: { userId: req.auth!.userId, readAt: null },
    });
    res.json({ count });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.patch("/:id/read", async (req, res, next) => {
  try {
    await prisma.notification.updateMany({
      where: { id: req.params.id, userId: req.auth!.userId },
      data: { readAt: new Date() },
    });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post("/read-all", async (req, res, next) => {
  try {
    const result = await prisma.notification.updateMany({
      where: { userId: req.auth!.userId, readAt: null },
      data: { readAt: new Date() },
    });
    res.json({ ok: true, updated: result.count });
  } catch (err) {
    next(err);
  }
});
