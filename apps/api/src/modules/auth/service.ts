import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import type { LoginInput, RegisterInput } from "@audithub/types";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../middleware/error.js";

function signAccess(payload: object) {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: env.JWT_ACCESS_TTL } as SignOptions);
}

function signRefresh(payload: object) {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, { expiresIn: env.JWT_REFRESH_TTL } as SignOptions);
}

export async function login(input: LoginInput) {
  const user = await prisma.user.findUnique({
    where: { email: input.email },
    include: { role: true },
  });
  if (!user || !user.isActive) throw new HttpError(401, "Invalid credentials");

  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  const payload = { userId: user.id, orgId: user.orgId, role: user.role.name };
  return {
    accessToken: signAccess(payload),
    refreshToken: signRefresh({ userId: user.id }),
    user: { id: user.id, name: user.name, email: user.email, role: user.role.name },
  };
}

export async function refresh(refreshToken: string) {
  if (!refreshToken) throw new HttpError(400, "Missing refreshToken");
  let decoded: { userId: string };
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as { userId: string };
  } catch {
    throw new HttpError(401, "Invalid refresh token");
  }
  const user = await prisma.user.findUnique({
    where: { id: decoded.userId },
    include: { role: true },
  });
  if (!user || !user.isActive) throw new HttpError(401, "Invalid user");
  const payload = { userId: user.id, orgId: user.orgId, role: user.role.name };
  return {
    accessToken: signAccess(payload),
    refreshToken: signRefresh({ userId: user.id }),
  };
}

export async function forgotPassword(_email: string) {
  // TODO: issue password reset token + email it
}

export async function resetPassword(_input: { token: string; password: string }) {
  // TODO: verify reset token, update passwordHash
}

export async function changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, "User not found");
  const ok = await bcrypt.compare(input.currentPassword, user.passwordHash);
  if (!ok) throw new HttpError(400, "Current password is incorrect");
  const passwordHash = await bcrypt.hash(input.newPassword, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
}

/**
 * Public signup — creates the org + a super_admin user in one transaction and
 * returns login tokens. Seeds the four system roles on first ever signup.
 */
export async function register(input: RegisterInput) {
  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) throw new HttpError(409, "An account with that email already exists");

  // Ensure the four canonical roles exist. Seeded already for the demo org, but
  // if this API is deployed fresh they might not be.
  await prisma.role.createMany({
    data: [
      { name: "super_admin", permissions: { "*": true } },
      { name: "auditor", permissions: {} },
      { name: "accountant", permissions: {} },
      { name: "staff", permissions: {} },
    ],
    skipDuplicates: true,
  });

  const adminRole = await prisma.role.findUnique({ where: { name: "super_admin" } });
  if (!adminRole) throw new HttpError(500, "Role bootstrap failed");

  const passwordHash = await bcrypt.hash(input.password, 12);

  const { user, org } = await prisma.$transaction(async (tx) => {
    const org = await tx.organization.create({
      data: { name: input.orgName, plan: "free" },
    });
    const user = await tx.user.create({
      data: {
        orgId: org.id,
        roleId: adminRole.id,
        name: input.name,
        email: input.email,
        passwordHash,
      },
      include: { role: true },
    });
    await tx.activityLog.create({
      data: {
        orgId: org.id,
        actorId: user.id,
        action: "org.created",
        entity: "Organization",
        entityId: org.id,
        meta: { via: "signup" },
      },
    });
    return { user, org };
  });

  const payload = { userId: user.id, orgId: user.orgId, role: user.role.name };
  return {
    accessToken: signAccess(payload),
    refreshToken: signRefresh({ userId: user.id }),
    user: { id: user.id, name: user.name, email: user.email, role: user.role.name },
    org: { id: org.id, name: org.name },
  };
}

export async function me(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isActive: true,
      role: { select: { id: true, name: true } },
      org: { select: { id: true, name: true } },
    },
  });
  if (!user) throw new HttpError(404, "User not found");
  return user;
}
