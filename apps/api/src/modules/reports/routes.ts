import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { HttpError } from "../../middleware/error.js";
import { REPORT_TYPES, buildReport, type ReportType } from "./service.js";
import { buildReportXlsx } from "./xlsx.js";
import { renderReportPdf } from "./pdf.js";

export const reportsRouter = Router();

reportsRouter.use(requireAuth);

function parseRange(query: Record<string, unknown>): { from: Date; to: Date } {
  const now = new Date();
  const defaultFrom = new Date(now.getFullYear(), now.getMonth() - 11, 1);
  const defaultTo = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

  const from = query.from ? new Date(String(query.from)) : defaultFrom;
  const to = query.to ? new Date(String(query.to)) : defaultTo;

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new HttpError(400, "Invalid date range");
  }
  if (from > to) throw new HttpError(400, "'from' must be before 'to'");
  return { from, to };
}

function ensureType(raw: string): ReportType {
  if (!(REPORT_TYPES as readonly string[]).includes(raw)) {
    throw new HttpError(404, `Unknown report type: ${raw}`);
  }
  return raw as ReportType;
}

reportsRouter.get("/", (_req, res) => {
  res.json({ types: REPORT_TYPES });
});

reportsRouter.get("/:type", async (req, res, next) => {
  try {
    const type = ensureType(req.params.type);
    const range = parseRange(req.query as Record<string, unknown>);
    const payload = await buildReport(req.auth!.orgId, type, range);
    res.json(payload);
  } catch (err) {
    next(err);
  }
});

reportsRouter.get("/:type/export", async (req, res, next) => {
  try {
    const type = ensureType(req.params.type);
    const format = (req.query.format as string) ?? "xlsx";
    if (format !== "xlsx" && format !== "pdf") {
      throw new HttpError(400, "format must be xlsx or pdf");
    }

    const range = parseRange(req.query as Record<string, unknown>);
    const payload = await buildReport(req.auth!.orgId, type, range);
    const filename = `audithub-${type}-${new Date().toISOString().slice(0, 10)}`;

    if (format === "xlsx") {
      const buf = await buildReportXlsx(payload);
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      );
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.xlsx"`);
      res.send(buf);
    } else {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}.pdf"`);
      const doc = renderReportPdf(payload);
      doc.pipe(res);
    }
  } catch (err) {
    next(err);
  }
});
