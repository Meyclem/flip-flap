import { Types } from "mongoose";
import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";

import { ApiKey } from "../../src/models/api-key.model";
import { Flag } from "../../src/models/flag.model";
import { createApp } from "../../src/server";
import { cacheService } from "../../src/services/cache.service";
import { setupTestDatabase } from "../setup-db";

describe("Authentication Flow Integration", () => {
  const app = createApp();

  setupTestDatabase();

  beforeEach(async () => {
    await cacheService.invalidate();
  });

  describe("Flag evaluation with authentication", () => {
    it("should successfully evaluate flag with valid API key", async () => {
      const organizationId = new Types.ObjectId();

      const apiKey = await ApiKey.create({
        organizationId,
        key: "prod_test123",
        environment: "production",
        description: "Test key",
      });

      await Flag.create({
        organizationId,
        flagKey: "test-flag",
        name: "Test Flag",
        environments: {
          development: { enabled: false },
          staging: { enabled: false },
          production: { enabled: true },
        },
      });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .set("X-API-Key", apiKey.key)
        .send({
          flagKey: "test-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        flagKey: "test-flag",
        enabled: true,
        metadata: { reason: "flag_enabled" },
      });
    });

    it("should reject evaluation without API key", async () => {
      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "test-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("title", "Unauthorized");
      expect(response.body.detail).toContain("API key is required");
    });

    it("should reject evaluation with invalid API key", async () => {
      const response = await request(app)
        .post("/api/flags/evaluate")
        .set("X-API-Key", "invalid_key_12345")
        .send({
          flagKey: "test-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("title", "Unauthorized");
      expect(response.body.detail).toContain("Invalid API key");
    });
  });

  describe("Environment inference from API key", () => {
    it("should use production config when API key is for production", async () => {
      const organizationId = new Types.ObjectId();

      const apiKey = await ApiKey.create({
        organizationId,
        key: "prod_production_key",
        environment: "production",
        description: "Production key",
      });

      await Flag.create({
        organizationId,
        flagKey: "env-test-flag",
        name: "Environment Test Flag",
        environments: {
          development: { enabled: true },
          staging: { enabled: true },
          production: { enabled: false },
        },
      });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .set("X-API-Key", apiKey.key)
        .send({
          flagKey: "env-test-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(false);
    });

    it("should use development config when API key is for development", async () => {
      const organizationId = new Types.ObjectId();

      const apiKey = await ApiKey.create({
        organizationId,
        key: "deve_development_key",
        environment: "development",
        description: "Development key",
      });

      await Flag.create({
        organizationId,
        flagKey: "env-dev-flag",
        name: "Environment Dev Flag",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .set("X-API-Key", apiKey.key)
        .send({
          flagKey: "env-dev-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(200);
      expect(response.body.enabled).toBe(true);
    });
  });

  describe("Organization isolation", () => {
    it("should not access flags from other organizations", async () => {
      const org1 = new Types.ObjectId();
      const org2 = new Types.ObjectId();

      await ApiKey.create({
        organizationId: org1,
        key: "prod_org1_key",
        environment: "production",
        description: "Org 1 key",
      });

      const apiKey2 = await ApiKey.create({
        organizationId: org2,
        key: "prod_org2_key",
        environment: "production",
        description: "Org 2 key",
      });

      await Flag.create({
        organizationId: org1,
        flagKey: "org1-flag",
        name: "Org 1 Flag",
        environments: {
          development: { enabled: false },
          staging: { enabled: false },
          production: { enabled: true },
        },
      });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .set("X-API-Key", apiKey2.key)
        .send({
          flagKey: "org1-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        flagKey: "org1-flag",
        enabled: false,
        metadata: { reason: "flag_not_found" },
      });
    });
  });

  describe("CRUD operations with authentication", () => {
    it("should create flag with valid API key", async () => {
      const organizationId = new Types.ObjectId();

      const apiKey = await ApiKey.create({
        organizationId,
        key: "prod_crud_key",
        environment: "production",
        description: "CRUD test key",
      });

      const response = await request(app)
        .post("/api/flags")
        .set("X-API-Key", apiKey.key)
        .send({
          flagKey: "new-flag",
          name: "New Flag",
          environments: {
            development: { enabled: true },
            staging: { enabled: false },
            production: { enabled: false },
          },
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("flagKey", "new-flag");
      expect(response.body).toHaveProperty("organizationId", organizationId.toString());
    });

    it("should reject flag creation without API key", async () => {
      const response = await request(app)
        .post("/api/flags")
        .send({
          flagKey: "unauthorized-flag",
          name: "Unauthorized Flag",
          environments: {
            development: { enabled: true },
            staging: { enabled: false },
            production: { enabled: false },
          },
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("title", "Unauthorized");
    });

    it("should list only flags from authenticated organization", async () => {
      const org1 = new Types.ObjectId();
      const org2 = new Types.ObjectId();

      const apiKey1 = await ApiKey.create({
        organizationId: org1,
        key: "prod_list_org1",
        environment: "production",
        description: "Org 1 list key",
      });

      await ApiKey.create({
        organizationId: org2,
        key: "prod_list_org2",
        environment: "production",
        description: "Org 2 list key",
      });

      await Flag.create({
        organizationId: org1,
        flagKey: "org1-flag-1",
        name: "Org 1 Flag 1",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await Flag.create({
        organizationId: org1,
        flagKey: "org1-flag-2",
        name: "Org 1 Flag 2",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await Flag.create({
        organizationId: org2,
        flagKey: "org2-flag-1",
        name: "Org 2 Flag 1",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      const response = await request(app)
        .get("/api/flags")
        .set("X-API-Key", apiKey1.key);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(response.body[0].organizationId).toBe(org1.toString());
      expect(response.body[1].organizationId).toBe(org1.toString());
    });
  });

  describe("API key management with authentication", () => {
    it("should create API key with valid authentication", async () => {
      const organizationId = new Types.ObjectId();

      const existingKey = await ApiKey.create({
        organizationId,
        key: "prod_existing",
        environment: "production",
        description: "Existing key",
      });

      const response = await request(app)
        .post("/api/keys")
        .set("X-API-Key", existingKey.key)
        .send({
          environment: "development",
          description: "New dev key",
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty("key");
      expect(response.body.environment).toBe("development");
      expect(response.body.organizationId).toBe(organizationId.toString());
    });

    it("should reject API key creation without authentication", async () => {
      const response = await request(app)
        .post("/api/keys")
        .send({
          environment: "production",
          description: "Unauthorized key",
        });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("title", "Unauthorized");
    });

    it("should list only API keys from authenticated organization", async () => {
      const org1 = new Types.ObjectId();
      const org2 = new Types.ObjectId();

      const apiKey1 = await ApiKey.create({
        organizationId: org1,
        key: "prod_list_keys_org1",
        environment: "production",
        description: "Org 1 prod key",
      });

      await ApiKey.create({
        organizationId: org1,
        key: "deve_list_keys_org1",
        environment: "development",
        description: "Org 1 dev key",
      });

      await ApiKey.create({
        organizationId: org2,
        key: "prod_list_keys_org2",
        environment: "production",
        description: "Org 2 prod key",
      });

      const response = await request(app)
        .get("/api/keys")
        .set("X-API-Key", apiKey1.key);

      expect(response.status).toBe(200);
      expect(response.body).toHaveLength(2);
      expect(
        response.body.every((key: { organizationId: string }) => key.organizationId === org1.toString()),
      ).toBe(true);
    });
  });
});
