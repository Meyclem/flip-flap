import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { ApiKey } from "../../src/models/api-key.model.js";
import { Organization } from "../../src/models/organization.model.js";
import { setupTestDatabase } from "../setup-db.js";

setupTestDatabase();

describe("ApiKey Model", () => {
  let organizationId: mongoose.Types.ObjectId;

  it("should create organization for tests", async () => {
    const org = await Organization.create({ name: "Test Org" });
    organizationId = org._id;
    expect(org.name).toBe("Test Org");
  });

  it("should create a valid API key", async () => {
    const apiKey = await ApiKey.create({
      organizationId,
      key: "prod_abc123xyz",
      environment: "production",
      description: "Production key for mobile app",
    });

    expect(apiKey.key).toBe("prod_abc123xyz");
    expect(apiKey.environment).toBe("production");
    expect(apiKey.description).toBe("Production key for mobile app");
  });

  it("should create API key without description", async () => {
    const apiKey = await ApiKey.create({
      organizationId,
      key: "dev_xyz789",
      environment: "development",
    });

    expect(apiKey.key).toBe("dev_xyz789");
    expect(apiKey.description).toBeUndefined();
  });

  it("should enforce unique key constraint", async () => {
    const uniqueKey = "unique_key_12345";

    await ApiKey.create({
      organizationId,
      key: uniqueKey,
      environment: "production",
    });

    await expect(
      ApiKey.create({
        organizationId,
        key: uniqueKey,
        environment: "development",
      }),
    ).rejects.toThrow();
  });

  it("should accept all valid environments", async () => {
    const dev = await ApiKey.create({
      organizationId,
      key: "dev_key1",
      environment: "development",
    });

    const staging = await ApiKey.create({
      organizationId,
      key: "staging_key1",
      environment: "staging",
    });

    const prod = await ApiKey.create({
      organizationId,
      key: "prod_key1",
      environment: "production",
    });

    expect(dev.environment).toBe("development");
    expect(staging.environment).toBe("staging");
    expect(prod.environment).toBe("production");
  });

  it("should reject invalid environment", async () => {
    await expect(
      ApiKey.create({
        organizationId,
        key: "test_key",
        environment: "testing",
      }),
    ).rejects.toThrow();
  });

  it("should trim description", async () => {
    const apiKey = await ApiKey.create({
      organizationId,
      key: "trim_test_key",
      environment: "production",
      description: "  Trimmed Description  ",
    });

    expect(apiKey.description).toBe("Trimmed Description");
  });

  it("should reject description exceeding maxlength", async () => {
    await expect(
      ApiKey.create({
        organizationId,
        key: "long_desc_key",
        environment: "production",
        description: "a".repeat(501),
      }),
    ).rejects.toThrow();
  });

  it("should set createdAt timestamp", async () => {
    const apiKey = await ApiKey.create({
      organizationId,
      key: "timestamp_key",
      environment: "production",
    });

    expect(apiKey.createdAt).toBeInstanceOf(Date);
  });

  it("should require organizationId", async () => {
    await expect(
      ApiKey.create({
        key: "no_org_key",
        environment: "production",
      }),
    ).rejects.toThrow();
  });

  it("should require key", async () => {
    await expect(
      ApiKey.create({
        organizationId,
        environment: "production",
      }),
    ).rejects.toThrow();
  });

  it("should require environment", async () => {
    await expect(
      ApiKey.create({
        organizationId,
        key: "no_env_key",
      }),
    ).rejects.toThrow();
  });

  it("should allow multiple keys for same organization and environment", async () => {
    const key1 = await ApiKey.create({
      organizationId,
      key: "prod_key_a",
      environment: "production",
      description: "First production key",
    });

    const key2 = await ApiKey.create({
      organizationId,
      key: "prod_key_b",
      environment: "production",
      description: "Second production key",
    });

    expect(key1.organizationId.toString()).toBe(key2.organizationId.toString());
    expect(key1.environment).toBe(key2.environment);
    expect(key1.key).not.toBe(key2.key);
  });

  it("should create compound index on organizationId and environment", async () => {
    const indexes = ApiKey.collection.getIndexes();
    const hasCompoundIndex = Object.keys(await indexes).some((key) =>
      key.includes("organizationId") && key.includes("environment"));
    expect(hasCompoundIndex).toBe(true);
  });

  it("should allow same key for different organizations", async () => {
    const org2 = await Organization.create({ name: "Test Org 2" });
    const sharedKey = "shared_key_123";

    await ApiKey.create({
      organizationId,
      key: sharedKey,
      environment: "production",
    });

    await expect(
      ApiKey.create({
        organizationId: org2._id,
        key: sharedKey,
        environment: "production",
      }),
    ).rejects.toThrow();
  });
});
