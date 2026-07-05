import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import jwt, { type SignOptions } from "jsonwebtoken";
import otplib from "otplib";
import QRCode from "qrcode";

const { authenticator } = otplib;
import type { LoginInput, RegisterInput } from "@audithub/types";
import { prisma } from "../../lib/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../middleware/error.js";
import { mailer } from "../../lib/mailer.js";

const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

/**
 * Secret for the short-lived "2FA challenge" token — DELIBERATELY different from
 * JWT_ACCESS_SECRET. requireAuth verifies bearer tokens with JWT_ACCESS_SECRET,
 * so a challenge token can never be used as an access token (it won't verify).
 */
const twoFaChallengeSecret = () =>
  crypto.createHmac("sha256", env.JWT_REFRESH_SECRET).update("2fa-challenge-v1").digest("hex");

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
  if (!user) throw new HttpError(401, "Invalid credentials");

  // Verify the password BEFORE the active-status check so we can return an
  // accurate "pending approval" vs "deactivated" message. This is a deliberate,
  // minor user-enumeration tradeoff for clearer UX — do not "fix" it back to a
  // status-first check.
  const ok = await bcrypt.compare(input.password, user.passwordHash);
  if (!ok) throw new HttpError(401, "Invalid credentials");

  if (!user.isActive) {
    throw new HttpError(
      403,
      user.approvedAt
        ? "Your account has been deactivated. Please contact the administrator."
        : "Your account is pending administrator approval. You'll be able to sign in once it's approved.",
    );
  }

  // Password is correct — if 2FA is on, don't issue tokens yet. Hand back a
  // short-lived challenge token (signed with a SEPARATE secret) that only the
  // /auth/2fa/verify endpoint accepts.
  if (user.twoFactorEnabled) {
    return {
      twoFactorRequired: true as const,
      challengeToken: jwt.sign({ userId: user.id, typ: "2fa" }, twoFaChallengeSecret(), {
        expiresIn: "5m",
      }),
    };
  }

  return issueSession(user);
}

type UserWithRole = { id: string; orgId: string; name: string; email: string; isPlatformAdmin: boolean; role: { name: string } };

async function issueSession(user: UserWithRole) {
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  const payload = {
    userId: user.id,
    orgId: user.orgId,
    role: user.role.name,
    isPlatformAdmin: user.isPlatformAdmin,
  };
  return {
    accessToken: signAccess(payload),
    refreshToken: signRefresh({ userId: user.id }),
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role.name,
      isPlatformAdmin: user.isPlatformAdmin,
    },
  };
}

/** Step 2 of login when 2FA is on: verify the code and issue the real session. */
export async function verifyTwoFactor(input: { challengeToken: string; code: string }) {
  let decoded: { userId: string; typ?: string };
  try {
    decoded = jwt.verify(input.challengeToken, twoFaChallengeSecret()) as { userId: string; typ?: string };
  } catch {
    throw new HttpError(401, "Your verification session expired. Please sign in again.");
  }
  if (decoded.typ !== "2fa") throw new HttpError(401, "Invalid verification session.");

  const user = await prisma.user.findUnique({ where: { id: decoded.userId }, include: { role: true } });
  if (!user || !user.isActive || !user.twoFactorEnabled || !user.twoFactorSecret) {
    throw new HttpError(401, "Invalid credentials");
  }

  const code = input.code.replace(/\s+/g, "");
  const totpOk = authenticator.verify({ token: code, secret: user.twoFactorSecret });

  if (!totpOk) {
    // Fall back to a one-time backup code.
    const hashed = sha256(code.toUpperCase());
    const idx = user.twoFactorBackupCodes.indexOf(hashed);
    if (idx === -1) throw new HttpError(401, "That code is incorrect. Try again.");
    const remaining = user.twoFactorBackupCodes.filter((_, i) => i !== idx);
    await prisma.user.update({ where: { id: user.id }, data: { twoFactorBackupCodes: remaining } });
  }

  return issueSession(user);
}

/** Begin 2FA enrolment: generate a secret + QR. Not enabled until first verify. */
export async function setupTwoFactor(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, "User not found");
  const secret = authenticator.generateSecret();
  await prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });
  const otpauthUrl = authenticator.keyuri(user.email, "AuditHub", secret);
  const qr = await QRCode.toDataURL(otpauthUrl);
  return { qr, secret, otpauthUrl };
}

export async function enableTwoFactor(userId: string, code: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) throw new HttpError(400, "Start setup before enabling two-factor auth.");
  if (!authenticator.verify({ token: code.replace(/\s+/g, ""), secret: user.twoFactorSecret })) {
    throw new HttpError(400, "That code didn't match. Check your authenticator app and try again.");
  }
  const backupCodes = Array.from({ length: 10 }, () =>
    crypto.randomBytes(4).toString("hex").toUpperCase(),
  );
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true, twoFactorBackupCodes: backupCodes.map((c) => sha256(c)) },
  });
  return { backupCodes };
}

export async function disableTwoFactor(userId: string, password: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new HttpError(404, "User not found");
  if (!(await bcrypt.compare(password, user.passwordHash))) {
    throw new HttpError(400, "Incorrect password.");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorBackupCodes: [] },
  });
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
  const payload = {
    userId: user.id,
    orgId: user.orgId,
    role: user.role.name,
    isPlatformAdmin: user.isPlatformAdmin,
  };
  return {
    accessToken: signAccess(payload),
    refreshToken: signRefresh({ userId: user.id }),
  };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  // Always return without revealing whether the email exists (no enumeration).
  if (!user) return;

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      resetTokenHash: sha256(token),
      resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour
    },
  });

  const link = `${env.APP_URL}/reset?token=${token}`;
  const html = `
    <div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto">
      <h2 style="color:#1f4fd1">Reset your AuditHub password</h2>
      <p>Hi ${user.name}, we received a request to reset your password. This link is valid for one hour and can be used once.</p>
      <p><a href="${link}" style="display:inline-block;background:#1f4fd1;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Reset password</a></p>
      <p style="color:#5b6478;font-size:13px">If you didn't request this, you can safely ignore this email — your password won't change.</p>
      <p style="color:#8a93a8;font-size:12px">Or paste this link into your browser:<br>${link}</p>
    </div>`;
  await mailer.send(user.email, "Reset your AuditHub password", html);
}

export async function resetPassword(input: { token: string; password: string }) {
  const user = await prisma.user.findFirst({
    where: { resetTokenHash: sha256(input.token), resetTokenExpiry: { gt: new Date() } },
  });
  if (!user) {
    throw new HttpError(400, "This reset link is invalid or has expired. Please request a new one.");
  }
  const passwordHash = await bcrypt.hash(input.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    // Clearing the token makes it single-use.
    data: { passwordHash, resetTokenHash: null, resetTokenExpiry: null },
  });
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
 * Public signup — creates the workspace (org) + its super_admin owner, but as a
 * PENDING account (isActive:false). No login tokens are returned; the user cannot
 * sign in until a platform admin approves them from the /admin control panel.
 * Seeds the four system roles on first ever signup.
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
        isActive: false, // pending — a platform admin must approve
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
        meta: { via: "signup", pendingApproval: true },
      },
    });
    return { user, org };
  });

  // No tokens — the account is pending. The client shows an "awaiting approval" state.
  return {
    pending: true,
    user: { id: user.id, name: user.name, email: user.email },
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
      isPlatformAdmin: true,
      approvedAt: true,
      twoFactorEnabled: true,
      role: { select: { id: true, name: true } },
      org: { select: { id: true, name: true } },
    },
  });
  if (!user) throw new HttpError(404, "User not found");
  return user;
}
