import { Router } from "express";
import bcrypt from "bcryptjs";
import { requireAuth } from "../../middleware/auth.js";
import { requireRole } from "../../middleware/rbac.js";
import { prisma } from "../../lib/prisma.js";
import { UserCreateSchema, UserUpdateSchema } from "@audithub/types";
import { HttpError } from "../../middleware/error.js";

export const usersRouter = Router();

usersRouter.use(requireAuth);

usersRouter.get("/", async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { orgId: req.auth!.orgId },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        roleId: true,
        role: { select: { id: true, name: true } },
        lastLoginAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: "asc" },
    });
    res.json(users);
  } catch (err) {
    next(err);
  }
});

usersRouter.post("/", requireRole("super_admin"), async (req, res, next) => {
  try {
    const input = UserCreateSchema.parse(req.body);

    const existing = await prisma.user.findUnique({ where: { email: input.email } });
    if (existing) throw new HttpError(409, "A user with that email already exists");

    const passwordHash = await bcrypt.hash(input.password, 12);
    const created = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        roleId: input.roleId,
        orgId: req.auth!.orgId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        roleId: true,
        role: { select: { id: true, name: true } },
        createdAt: true,
      },
    });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
});

usersRouter.patch("/:id", requireRole("super_admin"), async (req, res, next) => {
  try {
    const input = UserUpdateSchema.parse(req.body);

    const existing = await prisma.user.findFirst({
      where: { id: req.params.id, orgId: req.auth!.orgId },
      select: { id: true },
    });
    if (!existing) throw new HttpError(404, "User not found");

    const updated = await prisma.user.update({
      where: { id: existing.id },
      data: input,
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        roleId: true,
        role: { select: { id: true, name: true } },
      },
    });
    res.json(updated);
  } catch (err) {
    next(err);
  }
});
