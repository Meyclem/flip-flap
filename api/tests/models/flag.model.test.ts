import mongoose from "mongoose";
import { describe, expect, it } from "vitest";

import { Flag } from "../../src/models/flag.model.js";
import { Organization } from "../../src/models/organization.model.js";
import { setupTestDatabase } from "../setup-db.js";

setupTestDatabase();

describe("Flag Model", () => {
  let organizationId: mongoose.Types.ObjectId;

  it("should create organization for tests", async () => {
    const org = await Organization.create({ name: "Test Org" });
    organizationId = org._id;
    expect(org.name).toBe("Test Org");
  });

  it("should create a valid flag", async () => {
    const flag = await Flag.create({
      organizationId,
      flagKey: "test-feature",
      name: "Test Feature",
      description: "A test feature flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    expect(flag.flagKey).toBe("test-feature");
    expect(flag.name).toBe("Test Feature");
    expect(flag.environments.development.enabled).toBe(true);
  });

  it("should convert flagKey to lowercase", async () => {
    const flag = await Flag.create({
      organizationId,
      flagKey: "MixedCase-Feature",
      name: "Mixed Case",
      environments: {
        development: { enabled: true },
        staging: { enabled: true },
        production: { enabled: true },
      },
    });

    expect(flag.flagKey).toBe("mixedcase-feature");
  });

  it("should trim flagKey and name", async () => {
    const flag = await Flag.create({
      organizationId,
      flagKey: "  trimmed-key  ",
      name: "  Trimmed Name  ",
      environments: {
        development: { enabled: true },
        staging: { enabled: true },
        production: { enabled: true },
      },
    });

    expect(flag.flagKey).toBe("trimmed-key");
    expect(flag.name).toBe("Trimmed Name");
  });

  it("should enforce unique flagKey per organization", async () => {
    await Flag.create({
      organizationId,
      flagKey: "unique-key",
      name: "First Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: true },
        production: { enabled: true },
      },
    });

    await expect(
      Flag.create({
        organizationId,
        flagKey: "unique-key",
        name: "Duplicate Flag",
        environments: {
          development: { enabled: true },
          staging: { enabled: true },
          production: { enabled: true },
        },
      }),
    ).rejects.toThrow();
  });

  it("should allow same flagKey for different organizations", async () => {
    const org2 = await Organization.create({ name: "Test Org 2" });

    const flag1 = await Flag.create({
      organizationId,
      flagKey: "shared-key",
      name: "Flag 1",
      environments: {
        development: { enabled: true },
        staging: { enabled: true },
        production: { enabled: true },
      },
    });

    const flag2 = await Flag.create({
      organizationId: org2._id,
      flagKey: "shared-key",
      name: "Flag 2",
      environments: {
        development: { enabled: true },
        staging: { enabled: true },
        production: { enabled: true },
      },
    });

    expect(flag1.flagKey).toBe(flag2.flagKey);
    expect(flag1.organizationId.toString()).not.toBe(flag2.organizationId.toString());
  });

  it("should reject flagKey with invalid characters", async () => {
    await expect(
      Flag.create({
        organizationId,
        flagKey: "invalid@key!",
        name: "Invalid",
        environments: {
          development: { enabled: true },
          staging: { enabled: true },
          production: { enabled: true },
        },
      }),
    ).rejects.toThrow();
  });

  it("should reject flagKey exceeding maxlength", async () => {
    await expect(
      Flag.create({
        organizationId,
        flagKey: "a".repeat(101),
        name: "Too Long",
        environments: {
          development: { enabled: true },
          staging: { enabled: true },
          production: { enabled: true },
        },
      }),
    ).rejects.toThrow();
  });

  it("should store phases correctly", async () => {
    const flag = await Flag.create({
      organizationId,
      flagKey: "phased-rollout",
      name: "Phased Rollout",
      environments: {
        development: { enabled: true },
        staging: { enabled: true },
        production: {
          enabled: true,
          phases: [
            {
              startDate: "2025-01-01T00:00:00Z",
              endDate: "2025-01-15T00:00:00Z",
              percentage: 25,
            },
            {
              startDate: "2025-01-15T00:00:00Z",
              endDate: "2025-01-31T00:00:00Z",
              percentage: 50,
            },
          ],
        },
      },
    });

    expect(flag.environments.production.phases).toHaveLength(2);
    expect(flag.environments.production.phases?.[0].percentage).toBe(25);
    expect(flag.environments.production.phases?.[1].percentage).toBe(50);
  });

  it("should store context rules correctly", async () => {
    const flag = await Flag.create({
      organizationId,
      flagKey: "context-targeting",
      name: "Context Targeting",
      environments: {
        development: { enabled: true },
        staging: { enabled: true },
        production: {
          enabled: true,
          contextRules: {
            accountAge: { gte: 30, lt: 90 },
            location: { oneOf: ["US", "EU"] },
            planType: { eq: "premium" },
          },
        },
      },
    });

    const rules = flag.environments.production.contextRules;
    expect(rules).toBeDefined();
    expect(rules?.accountAge).toEqual({ gte: 30, lt: 90 });
    expect(rules?.location).toEqual({ oneOf: ["US", "EU"] });
    expect(rules?.planType).toEqual({ eq: "premium" });
  });

  it("should set timestamps automatically", async () => {
    const flag = await Flag.create({
      organizationId,
      flagKey: "timestamped",
      name: "Timestamped Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: true },
        production: { enabled: true },
      },
    });

    expect(flag.createdAt).toBeInstanceOf(Date);
    expect(flag.updatedAt).toBeInstanceOf(Date);
  });

  it("should update timestamps on modification", async () => {
    const flag = await Flag.create({
      organizationId,
      flagKey: "update-test",
      name: "Update Test",
      environments: {
        development: { enabled: true },
        staging: { enabled: true },
        production: { enabled: true },
      },
    });

    const originalUpdatedAt = flag.updatedAt;

    flag.name = "Updated Name";
    await flag.save();

    expect(flag.updatedAt.getTime()).not.toBe(originalUpdatedAt.getTime());
  });

  it("should store complex flag with all features", async () => {
    const flag = await Flag.create({
      organizationId,
      flagKey: "complex-flag",
      name: "Complex Flag",
      description: "A flag with all features enabled",
      environments: {
        development: {
          enabled: true,
        },
        staging: {
          enabled: true,
          phases: [
            {
              startDate: "2025-10-22T00:00:00Z",
              endDate: "2025-10-29T23:59:59Z",
              percentage: 50,
            },
          ],
          contextRules: {
            planType: { eq: "premium" },
          },
        },
        production: {
          enabled: true,
          phases: [
            {
              startDate: "2025-10-25T00:00:00Z",
              endDate: "2025-10-31T23:59:59Z",
              percentage: 30,
            },
            {
              startDate: "2025-11-01T00:00:00Z",
              percentage: 100,
            },
          ],
          contextRules: {
            accountAge: { gte: 30, lt: 90 },
            location: { oneOf: ["US", "EU"] },
            planType: { eq: "premium" },
            deviceType: { neq: "mobile" },
          },
        },
      },
    });

    expect(flag.flagKey).toBe("complex-flag");
    expect(flag.environments.production.phases).toHaveLength(2);
    expect(flag.environments.production.contextRules).toBeDefined();
    expect(Object.keys(flag.environments.production.contextRules ?? {})).toHaveLength(4);
  });

  it("should require organizationId", async () => {
    await expect(
      Flag.create({
        flagKey: "no-org",
        name: "No Organization",
        environments: {
          development: { enabled: true },
          staging: { enabled: true },
          production: { enabled: true },
        },
      }),
    ).rejects.toThrow();
  });

  it("should require all three environments", async () => {
    await expect(
      Flag.create({
        organizationId,
        flagKey: "missing-env",
        name: "Missing Environment",
        environments: {
          development: { enabled: true },
        },
      }),
    ).rejects.toThrow();
  });

  it("should have compound index on organizationId and flagKey", async () => {
    const indexes = Flag.collection.getIndexes();
    const indexKeys = Object.keys(await indexes);
    const hasCompoundIndex = indexKeys.some((key) =>
      key.includes("organizationId") && key.includes("flagKey"));
    expect(hasCompoundIndex).toBe(true);
  });
});
