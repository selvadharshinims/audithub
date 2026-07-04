import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { pinoHttp } from "pino-http";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middleware/error.js";
import { apiRouter } from "./modules/index.js";

export const app = express();

// Behind Vercel/Render/Fly proxies, trust X-Forwarded-For so rate-limiting
// keys off the real client IP, not the proxy's.
if (env.NODE_ENV === "production") {
  app.set("trust proxy", 1);
}

app.use(helmet());

// CORS_ORIGIN can be a comma-separated allowlist for prod (web + preview URLs).
const allowedOrigins = env.CORS_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean);
app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin || allowedOrigins.includes(origin) || allowedOrigins.includes("*")) {
        cb(null, true);
      } else {
        cb(new Error(`CORS: origin ${origin} not allowed`));
      }
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));
app.use(pinoHttp({ logger }));
app.use(
  rateLimit({
    windowMs: 60_000,
    limit: 300,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "audithub-api", ts: new Date().toISOString() });
});

app.use("/api/v1", apiRouter);

app.use(errorHandler);
