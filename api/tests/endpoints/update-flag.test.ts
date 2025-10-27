import request from "supertest";
import { describe, expect, it } from "vitest";

import { Flag } from "../../src/models/flag.model";
import { createApp } from "../../src/server";
import { setupTestDatabase, TEST_API_KEY_DEV } from "../setup-db";

describe("PUT /api/flags/:key", () => {
  const app = createApp();

  setupTestDatabase();

  it("should update flag name", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "test-flag",
      name: "Old Name",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .put("/api/flags/test-flag")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send({ name: "New Name" });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("New Name");
    expect(response.body.flagKey).toBe("test-flag");
  });

  it("should update flag description", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "desc-flag",
      name: "Flag Name",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .put("/api/flags/desc-flag")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send({ description: "New description" });

    expect(response.status).toBe(200);
    expect(response.body.description).toBe("New description");
  });

  it("should update environment configurations", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "env-flag",
      name: "Environment Flag",
      environments: {
        development: { enabled: false },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .put("/api/flags/env-flag")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send({
        environments: {
          development: { enabled: true },
          staging: {
            enabled: true,
            phases: [
              {
                startDate: "2025-01-01T00:00:00.000Z",
                percentage: 50,
              },
            ],
          },
          production: { enabled: false },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.environments.development.enabled).toBe(true);
    expect(response.body.environments.staging.enabled).toBe(true);
    expect(response.body.environments.staging.phases).toHaveLength(1);
    expect(response.body.environments.staging.phases[0].percentage).toBe(50);
  });

  it("should update multiple fields at once", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "multi-flag",
      name: "Old Name",
      description: "Old description",
      environments: {
        development: { enabled: false },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .put("/api/flags/multi-flag")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send({
        name: "Updated Name",
        description: "Updated description",
        environments: {
          development: { enabled: true },
          staging: { enabled: true },
          production: { enabled: true },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe("Updated Name");
    expect(response.body.description).toBe("Updated description");
    expect(response.body.environments.development.enabled).toBe(true);
    expect(response.body.environments.staging.enabled).toBe(true);
    expect(response.body.environments.production.enabled).toBe(true);
  });

  it("should return 404 when flag does not exist", async () => {
    const response = await request(app)
      .put("/api/flags/non-existent")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send({ name: "New Name" });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      title: "Not Found",
      detail: "Flag with key 'non-existent' not found",
    });
  });

  it("should not update flags from other organizations", async () => {
    await Flag.create({
      organizationId: "000000000000000000000002",
      flagKey: "other-org-flag",
      name: "Other Org Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .put("/api/flags/other-org-flag")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send({ name: "Hacked Name" });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      title: "Not Found",
      detail: "Flag with key 'other-org-flag' not found",
    });
  });

  it("should reject invalid data", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "valid-flag",
      name: "Valid Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .put("/api/flags/valid-flag")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send({ name: "" });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      title: "Bad Request",
    });
  });

  it("should reject overlapping phases", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "phase-flag",
      name: "Phase Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .put("/api/flags/phase-flag")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send({
        environments: {
          development: {
            enabled: true,
            phases: [
              {
                startDate: "2025-01-01T00:00:00.000Z",
                endDate: "2025-06-30T23:59:59.999Z",
                percentage: 30,
              },
              {
                startDate: "2025-06-01T00:00:00.000Z",
                endDate: "2025-12-31T23:59:59.999Z",
                percentage: 70,
              },
            ],
          },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

    expect(response.status).toBe(400);
    expect(response.body).toMatchObject({
      title: "Bad Request",
    });
    expect(response.body.detail).toEqual(
      expect.arrayContaining([expect.stringContaining("Phase date ranges must not overlap")]),
    );
  });

  it("should update context rules", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "context-flag",
      name: "Context Flag",
      environments: {
        development: {
          enabled: true,
          contextRules: {
            location: { eq: "US" },
          },
        },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .put("/api/flags/context-flag")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send({
        environments: {
          development: {
            enabled: true,
            contextRules: {
              location: { oneOf: ["US", "CA", "EU"] },
              accountAge: { gte: 30 },
            },
          },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

    expect(response.status).toBe(200);
    expect(response.body.environments.development.contextRules).toEqual({
      location: { oneOf: ["US", "CA", "EU"] },
      accountAge: { gte: 30 },
    });
  });

  it("should preserve updatedAt timestamp change", async () => {
    const flag = await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "timestamp-flag",
      name: "Original Name",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const originalUpdatedAt = flag.updatedAt;

    await new Promise((resolve) => setTimeout(resolve, 10));

    const response = await request(app)
      .put("/api/flags/timestamp-flag")
      .set("X-API-Key", TEST_API_KEY_DEV)
      .send({ name: "Updated Name" });

    expect(response.status).toBe(200);
    expect(new Date(response.body.updatedAt).getTime()).toBeGreaterThan(
      originalUpdatedAt.getTime(),
    );
  });
});
