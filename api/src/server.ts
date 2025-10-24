import express from "express";

import { errorHandler } from "@/middleware/error-handler.middleware.js";
import { flagsRouter } from "@/routes/flags.routes.js";

export const createApp = () => {
  const app = express();

  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  app.use("/api/flags", flagsRouter);

  app.use(errorHandler);

  return app;
};
