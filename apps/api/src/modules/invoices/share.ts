import crypto from "node:crypto";
import { env } from "../../config/env.js";

// Stateless capability token for public invoice links (WhatsApp / email share).
// `<invoiceId>.<hmac>` — the HMAC (keyed on the server's JWT secret) makes the
// URL unguessable and tamper-proof without a DB column. Invoice IDs are UUIDs
// (no dots), so splitting on the last dot is unambiguous.

function sign(invoiceId: string): string {
  return crypto
    .createHmac("sha256", env.JWT_ACCESS_SECRET)
    .update(`invoice-share:${invoiceId}`)
    .digest("base64url");
}

export function makeInvoiceShareToken(invoiceId: string): string {
  return `${invoiceId}.${sign(invoiceId)}`;
}

export function verifyInvoiceShareToken(token: string): string | null {
  const dot = token.lastIndexOf(".");
  if (dot <= 0) return null;
  const invoiceId = token.slice(0, dot);
  const providedSig = token.slice(dot + 1);
  const expectedSig = sign(invoiceId);
  const a = Buffer.from(providedSig);
  const b = Buffer.from(expectedSig);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return invoiceId;
}
