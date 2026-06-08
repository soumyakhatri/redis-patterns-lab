import { Router } from "express";
import { categoryRouter } from "./category.routes.js";
import { healthRouter } from "./health.routes.js";
import { productRouter } from "./product.routes.js";

export const apiRouter = Router();

apiRouter.use("/health", healthRouter);
apiRouter.use("/products", productRouter);
apiRouter.use("/categories", categoryRouter);
