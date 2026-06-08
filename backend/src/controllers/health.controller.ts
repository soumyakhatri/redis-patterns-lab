import type { Request, Response } from "express";
import { getHealthReport } from "../services/health.service.js";

export async function getHealth(_req: Request, res: Response): Promise<void> {
  const report = await getHealthReport();
  const statusCode = report.postgres === "unavailable" ? 503 : 200;
  res.status(statusCode).json(report);
}
