import { Router } from "express";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { requireAuth, requirePlatformAdmin } from "../../middleware/auth.js";
import { prisma } from "../../lib/prisma.js";
import { HttpError } from "../../middleware/error.js";

export const adminRouter = Router();

// Every route here is platform-admin only. This is the real authorization
// boundary — the web sidebar/route guard is only cosmetic.
adminRouter.use(requireAuth, requirePlatformAdmin);

type UserWithRel = {
  isPlatformAdmin: boolean;
  isActive: boolean;
  approvedAt: Date | null;
};

function statusOf(u: UserWithRel): "platform" | "active" | "suspended" | "pending" {
  if (u.isPlatformAdmin) return "platform";
  if (u.isActive) return "active";
  return u.approvedAt ? "suspended" : "pending";
}

adminRouter.get("/overview", async (_req, res, next) => {
  try {
    const [totalUsers, activeUsers, totalWorkspaces, users] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { isActive: true } }),
      prisma.organization.count(),
      prisma.user.findMany({ select: { isPlatformAdmin: true, isActive: true, approvedAt: true } }),
    ]);
    const pendingUsers = users.filter((u) => statusOf(u) === "pending").length;
    const suspendedUsers = users.filter((u) => statusOf(u) === "suspended").length;
    res.json({ totalUsers, activeUsers, pendingUsers, suspendedUsers, totalWorkspaces });
  } catch (err) {
    next(err);
  }
});

adminRouter.get("/users", async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: [{ approvedAt: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        name: true,
        email: true,
        isActive: true,
        isPlatformAdmin: true,
        approvedAt: true,
        lastLoginAt: true,
        createdAt: true,
        role: { select: { name: true } },
        org: { select: { id: true, name: true } },
      },
    });
    res.json(
      users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role.name,
        workspace: u.org,
        isPlatformAdmin: u.isPlatformAdmin,
        status: statusOf(u),
        lastLoginAt: u.lastLoginAt,
        createdAt: u.createdAt,
      })),
    );
  } catch (err) {
    next(err);
  }
});

/** Load a target user and refuse any mutation against a platform admin. */
async function loadMutableTarget(id: string) {
  const target = await prisma.user.findUnique({ where: { id } });
  if (!target) throw new HttpError(404, "User not found");
  if (target.isPlatformAdmin) throw new HttpError(403, "Platform admin accounts cannot be modified here.");
  return target;
}

const ActionSchema = z.object({ action: z.enum(["approve", "activate", "deactivate"]) });

adminRouter.patch("/users/:id", async (req, res, next) => {
  try {
    const { action } = ActionSchema.parse(req.body);
    const target = await loadMutableTarget(req.params.id);

    const data =
      action === "deactivate"
        ? { isActive: false }
        : { isActive: true, approvedAt: target.approvedAt ?? new Date() };

    const updated = await prisma.user.update({
      where: { id: target.id },
      data,
      select: { id: true, isActive: true, approvedAt: true },
    });
    res.json({ id: updated.id, status: statusOf({ ...updated, isPlatformAdmin: false }) });
  } catch (err) {
    next(err);
  }
});

const ResetSchema = z.object({ password: z.string().min(8, "Password must be at least 8 characters") });

adminRouter.post("/users/:id/reset-password", async (req, res, next) => {
  try {
    const { password } = ResetSchema.parse(req.body);
    const target = await loadMutableTarget(req.params.id);
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.user.update({ where: { id: target.id }, data: { passwordHash } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

adminRouter.delete("/users/:id", async (req, res, next) => {
  try {
    const target = await loadMutableTarget(req.params.id);
    await prisma.$transaction(async (tx) => {
      await tx.user.delete({ where: { id: target.id } });
      // If that was the last member of the workspace, remove the workspace too
      // (cascades away all of its clients/invoices/payments/etc.).
      const remaining = await tx.user.count({ where: { orgId: target.orgId } });
      if (remaining === 0) await tx.organization.delete({ where: { id: target.orgId } });
    });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});
