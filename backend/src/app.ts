import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { apiRouter } from "./routes/index.js";

export function createApp() {
  const app = express();

  app.use(
    cors({
      origin: env.CORS_ORIGIN,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get("/", (_req, res) => {
    res.json({
      name: "Redis Patterns Lab API",
      phase: 2,
      docs: {
        health: "/api/health",
        products: "/api/products",
        categories: "/api/categories",
      },
    });
  });

  app.use("/api", apiRouter);
  app.use(errorHandler);

  return app;
}
