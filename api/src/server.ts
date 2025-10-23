import express from "express";

export const createApp = () => {
  const app = express();

  app.use(express.json());

  app.get("/health", (_request, response) => {
    response.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  return app;
};
