import request from "supertest";
import { describe, expect, it } from "vitest";

import { Flag } from "../../src/models/flag.model";
import { createApp } from "../../src/server";
import { setupTestDatabase, TEST_API_KEY_DEV } from "../setup-db";

describe("GET /api/flags/:key", () => {
  const app = createApp();

  setupTestDatabase();

  it("should return flag by key", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "test-flag",
      name: "Test Flag",
      description: "A test flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .get("/api/flags/test-flag")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      flagKey: "test-flag",
      name: "Test Flag",
      description: "A test flag",
    });
  });

  it("should return 404 when flag does not exist", async () => {
    const response = await request(app)
      .get("/api/flags/non-existent")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      title: "Not Found",
      detail: "Flag with key 'non-existent' not found",
    });
  });

  it("should return all flag details including environments", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "detailed-flag",
      name: "Detailed Flag",
      environments: {
        development: {
          enabled: true,
          phases: [
            {
              startDate: "2025-01-01T00:00:00.000Z",
              endDate: "2025-12-31T23:59:59.999Z",
              percentage: 75,
            },
          ],
          contextRules: {
            location: { oneOf: ["US", "CA"] },
            accountAge: { gte: 30 },
          },
        },
        staging: {
          enabled: false,
        },
        production: {
          enabled: true,
          phases: [
            {
              startDate: "2025-06-01T00:00:00.000Z",
              percentage: 25,
            },
          ],
        },
      },
    });

    const response = await request(app)
      .get("/api/flags/detailed-flag")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body.environments).toMatchObject({
      development: {
        enabled: true,
        phases: [
          {
            startDate: "2025-01-01T00:00:00.000Z",
            endDate: "2025-12-31T23:59:59.999Z",
            percentage: 75,
          },
        ],
        contextRules: {
          location: { oneOf: ["US", "CA"] },
          accountAge: { gte: 30 },
        },
      },
      staging: {
        enabled: false,
      },
      production: {
        enabled: true,
        phases: [
          {
            startDate: "2025-06-01T00:00:00.000Z",
            percentage: 25,
          },
        ],
      },
    });
  });

  it("should include timestamps and IDs", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "timestamped-flag",
      name: "Timestamped Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .get("/api/flags/timestamped-flag")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty("_id");
    expect(response.body).toHaveProperty("organizationId");
    expect(response.body).toHaveProperty("createdAt");
    expect(response.body).toHaveProperty("updatedAt");
  });

  it("should not return flags from other organizations", async () => {
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
      .get("/api/flags/other-org-flag")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      title: "Not Found",
      detail: "Flag with key 'other-org-flag' not found",
    });
  });

  it("should handle flags with minimal configuration", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "minimal-flag",
      name: "Minimal Flag",
      environments: {
        development: { enabled: false },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .get("/api/flags/minimal-flag")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      flagKey: "minimal-flag",
      name: "Minimal Flag",
      environments: {
        development: { enabled: false },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });
    expect(response.body.description).toBeUndefined();
  });
});
