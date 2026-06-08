import type { Request, Response } from "express";
import { getProductById, listProducts } from "../services/product.service.js";

function setCacheHeader(res: Response, cache: string): void {
  res.setHeader("X-Cache", cache);
}

export async function getProducts(_req: Request, res: Response): Promise<void> {
  const { data, cache } = await listProducts();
  setCacheHeader(res, cache);
  res.json({ products: data });
}

export async function getProduct(req: Request, res: Response): Promise<void> {
  const id = req.params.id as string;
  const { data, cache } = await getProductById(id);
  setCacheHeader(res, cache);
  res.json({ product: data });
}
