import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../src/server";

describe("Health Check Endpoint", () => {
  const app = createApp();

  it("should return 200 status", async () => {
    const response = await request(app).get("/health");

    expect(response.status).toBe(200);
  });

  it("should return ok status and timestamp", async () => {
    const response = await request(app).get("/health");

    expect(response.body).toHaveProperty("status", "ok");
    expect(response.body).toHaveProperty("timestamp");
  });

  it("should return valid ISO timestamp", async () => {
    const response = await request(app).get("/health");

    const timestamp = new Date(response.body.timestamp);
    expect(timestamp.toISOString()).toBe(response.body.timestamp);
  });
});
