import { Router } from "express";
import { z } from "zod";
import {
  getCategories,
  getCategory,
} from "../controllers/category.controller.js";
import { validate } from "../middleware/validate.js";

export const categoryRouter = Router();

const slugParamsSchema = z.object({
  slug: z
    .string()
    .min(1)
    .regex(/^[a-z0-9-]+$/, "Invalid category slug"),
});

categoryRouter.get("/", getCategories);
categoryRouter.get("/:slug", validate(slugParamsSchema, "params"), getCategory);
