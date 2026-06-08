import { Router } from "express";
import { z } from "zod";
import { getProduct, getProducts } from "../controllers/product.controller.js";
import { validate } from "../middleware/validate.js";

export const productRouter = Router();

const idParamsSchema = z.object({
  id: z.string().uuid("Invalid product id"),
});

productRouter.get("/", getProducts);
productRouter.get("/:id", validate(idParamsSchema, "params"), getProduct);
