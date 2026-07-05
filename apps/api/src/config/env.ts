import { z } from "zod";

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  PORT: z.coerce.number().default(4000),
  CORS_ORIGIN: z.string().default("http://localhost:3000"),
  // Public URL of the web app — used to build password-reset links in emails.
  APP_URL: z.string().default("http://localhost:3000"),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_TTL: z.string().default("7d"),

  // Platform super admin — bootstrapped on boot (its own workspace, always active).
  // Change the password after first login via the account settings.
  PLATFORM_ADMIN_EMAIL: z.string().email().default("info@digitalvetri.com"),
  PLATFORM_ADMIN_PASSWORD: z.string().min(8).default("DigitalVetri@2026"),
  PLATFORM_ADMIN_NAME: z.string().default("Digital Vetri Admin"),

  // SMTP — optional; when SMTP_HOST is set, the mailer sends real emails.
  // When unset (or in tests), the ConsoleMailer logs instead.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_FROM: z.string().default("AuditHub <no-reply@audithub.local>"),

  // Object storage — optional; when S3_BUCKET is set, uploads go to S3
  // (or any S3-compatible service: R2, Wasabi, Backblaze, MinIO, Spaces).
  // Otherwise the LocalStorage adapter writes to ./uploads on disk.
  S3_BUCKET: z.string().optional(),
  S3_REGION: z.string().default("auto"),
  S3_ENDPOINT: z.string().optional(),
  S3_ACCESS_KEY_ID: z.string().optional(),
  S3_SECRET_ACCESS_KEY: z.string().optional(),
  S3_FORCE_PATH_STYLE: z.coerce.boolean().default(false),
  UPLOAD_ROOT: z.string().default("uploads"),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment configuration:", parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

// Production safety guards. These run ONLY in production so local dev (which
// uses the placeholder defaults) is never affected. Security misconfig →
// refuse to boot; missing email/storage → loud warning (degrades, not crashes).
if (env.NODE_ENV === "production") {
  const fatal: string[] = [];
  const placeholderSecret = (s: string) => /^change-me/.test(s) || s.length < 32;
  if (placeholderSecret(env.JWT_ACCESS_SECRET))
    fatal.push("JWT_ACCESS_SECRET must be a strong random secret (≥32 chars), not the placeholder.");
  if (placeholderSecret(env.JWT_REFRESH_SECRET))
    fatal.push("JWT_REFRESH_SECRET must be a strong random secret (≥32 chars), not the placeholder.");
  if (env.PLATFORM_ADMIN_PASSWORD === "DigitalVetri@2026")
    fatal.push("PLATFORM_ADMIN_PASSWORD must be changed from the committed default before launch.");
  if (env.APP_URL.includes("localhost"))
    fatal.push("APP_URL must be your real web app URL (password-reset emails link to it), not localhost.");

  if (fatal.length) {
    console.error(
      "\n✗ Refusing to start: insecure production configuration.\n - " + fatal.join("\n - ") + "\n",
    );
    process.exit(1);
  }

  if (!env.SMTP_HOST)
    console.warn("⚠ SMTP_HOST is not set — password-reset, invoice and reminder emails will NOT be delivered.");
  if (!env.S3_BUCKET)
    console.warn("⚠ S3_BUCKET is not set — uploaded documents go to local disk and are LOST on restart/redeploy.");
}
