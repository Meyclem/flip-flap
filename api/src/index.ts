import "dotenv/config";
import express from "express";

import { connectDatabase } from "@/config/database.js";

const app = express();
const PORT = process.env.PORT ?? 3000;

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok", timestamp: new Date().toISOString() });
});

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`🚀 flip-flap API running on port ${PORT}`);
      console.log(`📋 Health check: http://localhost:${PORT}/health`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

startServer();
