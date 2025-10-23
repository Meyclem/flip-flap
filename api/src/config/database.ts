import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI ?? "mongodb://localhost:27017/flip-flap";

export const connectDatabase = async (): Promise<void> => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("✅ Connected to MongoDB");
  } catch (error) {
    console.error("❌ MongoDB connection error:", error);
    throw error;
  }
};

mongoose.connection.on("error", (error) => {
  console.error("MongoDB connection error:", error);
});

mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected");
});

process.on("SIGINT", async () => {
  await mongoose.connection.close();
  console.log("MongoDB connection closed through app termination");
  process.exit(0);
});
