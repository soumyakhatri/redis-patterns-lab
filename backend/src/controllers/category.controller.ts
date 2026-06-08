import type { Request, Response } from "express";
import {
  getCategoryBySlug,
  listCategories,
} from "../services/category.service.js";

function setCacheHeader(res: Response, cache: string): void {
  res.setHeader("X-Cache", cache);
}

export async function getCategories(_req: Request, res: Response): Promise<void> {
  const { data, cache } = await listCategories();
  setCacheHeader(res, cache);
  res.json({ categories: data });
}

export async function getCategory(req: Request, res: Response): Promise<void> {
  const slug = req.params.slug as string;
  const { data, cache } = await getCategoryBySlug(slug);
  setCacheHeader(res, cache);
  res.json({ category: data });
}
