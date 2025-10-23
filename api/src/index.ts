import "dotenv/config";

import { connectDatabase } from "@/config/database.js";
import { createApp } from "@/server.js";

const startServer = async () => {
  try {
    await connectDatabase();

    const app = createApp();
    const PORT = process.env.PORT ?? 3000;

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
