import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, refresh, forgot, reset, changePassword, me, register } from "./controller.js";
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
