import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/server";
import { setupTestDatabase, TEST_API_KEY_DEV } from "../setup-db";

describe("POST /api/keys", () => {
  const app = createApp();

  setupTestDatabase();

  it("should create a new API key with valid data", async () => {
    const keyData = {
      environment: "production",
      description: "Production API key for main app",
    };

    const response = await request(app)
      .post("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send(keyData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("_id");
    expect(response.body).toHaveProperty("organizationId");
    expect(response.body.environment).toBe("production");
    expect(response.body.description).toBe("Production API key for main app");
    expect(response.body).toHaveProperty("key");
    expect(response.body.key).toMatch(/^prod_[a-f0-9]{64}$/);
    expect(response.body).toHaveProperty("createdAt");
  });

  it("should create API key for development environment", async () => {
    const keyData = {
      environment: "development",
      description: "Dev API key",
    };

    const response = await request(app)
      .post("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send(keyData);

    expect(response.status).toBe(201);
    expect(response.body.environment).toBe("development");
    expect(response.body.key).toMatch(/^deve_[a-f0-9]{64}$/);
  });

  it("should create API key for staging environment", async () => {
    const keyData = {
      environment: "staging",
      description: "Staging API key",
    };

    const response = await request(app)
      .post("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send(keyData);

    expect(response.status).toBe(201);
    expect(response.body.environment).toBe("staging");
    expect(response.body.key).toMatch(/^stag_[a-f0-9]{64}$/);
  });

  it("should generate unique keys for multiple requests", async () => {
    const keyData = {
      environment: "production",
      description: "First key",
    };

    const response1 = await request(app)
      .post("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send(keyData);
    const response2 = await request(app)
      .post("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send(keyData);

    expect(response1.status).toBe(201);
    expect(response2.status).toBe(201);
    expect(response1.body.key).not.toBe(response2.body.key);
  });

  it("should create API key without description", async () => {
    const keyData = {
      environment: "production",
    };

    const response = await request(app)
      .post("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send(keyData);

    expect(response.status).toBe(201);
    expect(response.body.environment).toBe("production");
    expect(response.body.description).toBeUndefined();
  });

  it("should reject invalid environment value", async () => {
    const keyData = {
      environment: "invalid-env",
      description: "Test key",
    };

    const response = await request(app)
      .post("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send(keyData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("title", "Bad Request");
    expect(response.body).toHaveProperty("detail");
  });

  it("should reject missing environment field", async () => {
    const keyData = {
      description: "Test key",
    };

    const response = await request(app)
      .post("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send(keyData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("title", "Bad Request");
    expect(response.body).toHaveProperty("detail");
  });

  it("should reject description exceeding 500 characters", async () => {
    const keyData = {
      environment: "production",
      description: "a".repeat(501),
    };

    const response = await request(app)
      .post("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send(keyData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("title", "Bad Request");
    expect(response.body).toHaveProperty("detail");
  });

  it("should accept description with exactly 500 characters", async () => {
    const keyData = {
      environment: "production",
      description: "a".repeat(500),
    };

    const response = await request(app)
      .post("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send(keyData);

    expect(response.status).toBe(201);
    expect(response.body.description).toHaveLength(500);
  });

  it("should create key for correct organization", async () => {
    const keyData = {
      environment: "production",
      description: "Org test key",
    };

    const response = await request(app)
      .post("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send(keyData);

    expect(response.status).toBe(201);
    expect(response.body.organizationId).toBe("000000000000000000000001");
  });
});
