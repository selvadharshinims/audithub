import nodemailer, { type Transporter } from "nodemailer";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export interface MailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface MailOptions {
  attachments?: MailAttachment[];
}

export interface Mailer {
  send(to: string, subject: string, html: string, options?: MailOptions): Promise<void>;
}

/**
 * Dev fallback — logs to the API console. Kept for local dev, tests, and
 * production deployments where SMTP hasn't been configured yet.
 */
class ConsoleMailer implements Mailer {
  async send(to: string, subject: string, html: string, options?: MailOptions): Promise<void> {
    const attachmentSummary = options?.attachments?.length
      ? options.attachments.map((a) => `${a.filename} (${a.content.byteLength}B)`).join(", ")
      : "none";
    logger.info(
      { to, subject, attachments: attachmentSummary, from: env.SMTP_FROM },
      "mailer.send (console)",
    );
    logger.debug({ html }, "mailer body");
  }
}

/**
 * Real SMTP delivery via nodemailer. Any provider that speaks SMTP works —
 * Resend, Postmark, Mailgun, SendGrid, Brevo, Gmail (with app password), SES.
 */
class SmtpMailer implements Mailer {
  private transport: Transporter;

  constructor(host: string, port: number, user?: string, pass?: string, secure = false) {
    this.transport = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
    });
    this.transport
      .verify()
      .then(() => logger.info({ host, port }, "mailer: SMTP transport verified"))
      .catch((err) => logger.error({ err }, "mailer: SMTP transport failed to verify"));
  }

  async send(to: string, subject: string, html: string, options?: MailOptions): Promise<void> {
    await this.transport.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
      attachments: options?.attachments?.map((a) => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });
  }
}

function makeMailer(): Mailer {
  if (env.SMTP_HOST) {
    logger.info({ host: env.SMTP_HOST, port: env.SMTP_PORT }, "mailer: using SMTP");
    return new SmtpMailer(env.SMTP_HOST, env.SMTP_PORT, env.SMTP_USER, env.SMTP_PASS, env.SMTP_SECURE);
  }
  logger.info("mailer: SMTP_HOST not set — using ConsoleMailer (dev fallback)");
  return new ConsoleMailer();
}

export const mailer: Mailer = makeMailer();
