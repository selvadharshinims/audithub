import { Router } from "express";
import rateLimit from "express-rate-limit";
import { z } from "zod";
import { login, refresh, forgot, reset, changePassword, me, register } from "./controller.js";
import * as service from "./service.js";
import { requireAuth } from "../../middleware/auth.js";

// Signup + login get tighter rate limits than the rest of the API (which has a
// blanket 300/min) — this specifically blocks credential stuffing / signup spam.
const authLimit = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please try again in a minute." },
});

export const authRouter = Router();

authRouter.post("/register", authLimit, register);
authRouter.post("/login", authLimit, login);
authRouter.post("/refresh", refresh);
authRouter.post("/forgot", authLimit, forgot);
authRouter.post("/reset", authLimit, reset);
authRouter.post("/change-password", requireAuth, changePassword);
authRouter.get("/me", requireAuth, me);

// ── Two-factor auth ──────────────────────────────────────────────
const VerifySchema = z.object({ challengeToken: z.string().min(1), code: z.string().min(1) });
const CodeSchema = z.object({ code: z.string().min(1) });
const DisableSchema = z.object({ password: z.string().min(1) });

// Step 2 of login — public but rate-limited like the rest of the auth surface.
authRouter.post("/2fa/verify", authLimit, async (req, res, next) => {
  try {
    res.json(await service.verifyTwoFactor(VerifySchema.parse(req.body)));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/2fa/setup", requireAuth, async (req, res, next) => {
  try {
    res.json(await service.setupTwoFactor(req.auth!.userId));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/2fa/enable", requireAuth, async (req, res, next) => {
  try {
    res.json(await service.enableTwoFactor(req.auth!.userId, CodeSchema.parse(req.body).code));
  } catch (err) {
    next(err);
  }
});

authRouter.post("/2fa/disable", requireAuth, async (req, res, next) => {
  try {
    await service.disableTwoFactor(req.auth!.userId, DisableSchema.parse(req.body).password);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});
