import bcrypt from "bcryptjs";
import { prisma } from "./prisma.js";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

/** The four system roles — needed before we can attach super_admin to the admin. */
async function ensureRoles() {
  await prisma.role.createMany({
    data: [
      { name: "super_admin", permissions: { "*": true } },
      { name: "auditor", permissions: {} },
      { name: "accountant", permissions: {} },
      { name: "staff", permissions: {} },
    ],
    skipDuplicates: true,
  });
}

/**
 * Idempotently ensure the platform super admin (info@digitalvetri.com) exists.
 * Runs on every boot. On a fresh DB it creates the admin + its own workspace;
 * if the account already exists it only re-asserts the flags (never resets the
 * password, so a changed password survives restarts).
 */
export async function ensurePlatformAdmin(): Promise<void> {
  await ensureRoles();
  const superAdmin = await prisma.role.findUnique({ where: { name: "super_admin" } });
  if (!superAdmin) throw new Error("Role bootstrap failed: super_admin missing");

  const email = env.PLATFORM_ADMIN_EMAIL.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    if (!existing.isPlatformAdmin || !existing.isActive || !existing.approvedAt) {
      await prisma.user.update({
        where: { id: existing.id },
        data: { isPlatformAdmin: true, isActive: true, approvedAt: existing.approvedAt ?? new Date() },
      });
      logger.info(`Platform admin ${email} re-asserted (active + platform flag).`);
    }
    return;
  }

  const passwordHash = await bcrypt.hash(env.PLATFORM_ADMIN_PASSWORD, 12);
  await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: "Digital Vetri (Platform)", plan: "platform" },
    });
    await tx.user.create({
      data: {
        orgId: org.id,
        roleId: superAdmin.id,
        name: env.PLATFORM_ADMIN_NAME,
        email,
        passwordHash,
        isActive: true,
        isPlatformAdmin: true,
        approvedAt: new Date(),
      },
    });
  });
  logger.info(`Platform admin created: ${email} (change the password after first login).`);
}
