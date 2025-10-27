import request from "supertest";
import { describe, expect, it } from "vitest";

import { ApiKey } from "../../src/models/api-key.model";
import { createApp } from "../../src/server";
import { setupTestDatabase, TEST_API_KEY_DEV } from "../setup-db";

describe("GET /api/keys", () => {
  const app = createApp();

  setupTestDatabase();

  it("should return existing API keys for the organization", async () => {
    const response = await request(app)
      .get("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body[0]).toHaveProperty("key");
    expect(response.body[0]).toHaveProperty("environment");
    expect(response.body[0]).toHaveProperty("organizationId");
  });

  it("should return all API keys for the organization", async () => {
    await ApiKey.deleteMany({});
    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: TEST_API_KEY_DEV,
      environment: "development",
    });
    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: "prod_abc123",
      environment: "production",
      description: "Production key",
    });

    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: "deve_xyz789",
      environment: "development",
      description: "Development key",
    });

    const response = await request(app)
      .get("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);

    const keys = response.body.map((k: { key: string }) => k.key);
    expect(keys).toContain(TEST_API_KEY_DEV);
    expect(keys).toContain("prod_abc123");
    expect(keys).toContain("deve_xyz789");

    const prodKey = response.body.find((k: { key: string }) => k.key === "prod_abc123");
    expect(prodKey).toMatchObject({
      key: "prod_abc123",
      environment: "production",
      description: "Production key",
    });

    const devKey = response.body.find((k: { key: string }) => k.key === "deve_xyz789");
    expect(devKey).toMatchObject({
      key: "deve_xyz789",
      environment: "development",
      description: "Development key",
    });
  });

  it("should return keys sorted by createdAt descending (newest first)", async () => {
    await ApiKey.deleteMany({});
    const key0 = await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: TEST_API_KEY_DEV,
      environment: "development",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const key1 = await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: "prod_old123",
      environment: "production",
      description: "Old key",
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const key2 = await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: "prod_new456",
      environment: "production",
      description: "New key",
    });

    const response = await request(app)
      .get("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(3);
    expect(response.body[0]._id).toBe(key2._id.toString());
    expect(response.body[1]._id).toBe(key1._id.toString());
    expect(response.body[2]._id).toBe(key0._id.toString());
  });

  it("should include all key properties", async () => {
    await ApiKey.deleteMany({});
    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: TEST_API_KEY_DEV,
      environment: "development",
    });
    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: "prod_complete123",
      environment: "production",
      description: "Complete key with all fields",
    });

    const response = await request(app)
      .get("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);

    const prodKey = response.body.find((k: { key: string }) => k.key === "prod_complete123");
    expect(prodKey).toMatchObject({
      key: "prod_complete123",
      environment: "production",
      description: "Complete key with all fields",
    });
    expect(prodKey).toHaveProperty("_id");
    expect(prodKey).toHaveProperty("organizationId");
    expect(prodKey).toHaveProperty("createdAt");
  });

  it("should only return keys for the current organization", async () => {
    await ApiKey.deleteMany({});
    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: TEST_API_KEY_DEV,
      environment: "development",
    });
    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: "prod_org1key",
      environment: "production",
      description: "Org 1 key",
    });

    await ApiKey.create({
      organizationId: "000000000000000000000002",
      key: "prod_org2key",
      environment: "production",
      description: "Org 2 key",
    });

    const response = await request(app)
      .get("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);

    const keys = response.body.map((k: { key: string }) => k.key);
    expect(keys).toContain(TEST_API_KEY_DEV);
    expect(keys).toContain("prod_org1key");
    expect(keys).not.toContain("prod_org2key");

    response.body.forEach((key: { organizationId: string }) => {
      expect(key.organizationId).toBe("000000000000000000000001");
    });
  });

  it("should return keys for all environments mixed together", async () => {
    await ApiKey.deleteMany({});
    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: TEST_API_KEY_DEV,
      environment: "development",
    });
    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: "prod_key1",
      environment: "production",
    });

    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: "stag_key2",
      environment: "staging",
    });

    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: "deve_key3",
      environment: "development",
    });

    const response = await request(app)
      .get("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(4);

    const environments = response.body.map((k: { environment: string }) => k.environment);
    expect(environments).toContain("production");
    expect(environments).toContain("staging");
    expect(environments).toContain("development");
  });

  it("should return key without description when not provided", async () => {
    await ApiKey.deleteMany({});
    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: TEST_API_KEY_DEV,
      environment: "development",
    });
    await ApiKey.create({
      organizationId: "000000000000000000000001",
      key: "prod_nodesc123",
      environment: "production",
    });

    const response = await request(app)
      .get("/api/keys")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0].description).toBeUndefined();
  });
});
