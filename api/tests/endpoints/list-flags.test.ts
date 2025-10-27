import request from "supertest";
import { describe, expect, it } from "vitest";

import { Flag } from "../../src/models/flag.model";
import { createApp } from "../../src/server";
import { setupTestDatabase, TEST_API_KEY_DEV } from "../setup-db";

describe("GET /api/flags", () => {
  const app = createApp();

  setupTestDatabase();

  it("should return empty array when no flags exist", async () => {
    const response = await request(app)
      .get("/api/flags")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it("should return all flags for the organization", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "flag-1",
      name: "Flag 1",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "flag-2",
      name: "Flag 2",
      description: "Second flag",
      environments: {
        development: { enabled: false },
        staging: { enabled: true },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .get("/api/flags")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]).toMatchObject({
      flagKey: "flag-2",
      name: "Flag 2",
      description: "Second flag",
    });
    expect(response.body[1]).toMatchObject({
      flagKey: "flag-1",
      name: "Flag 1",
    });
  });

  it("should return flags sorted by createdAt descending (newest first)", async () => {
    const flag1 = await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "old-flag",
      name: "Old Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    await new Promise((resolve) => setTimeout(resolve, 10));

    const flag2 = await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "new-flag",
      name: "New Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .get("/api/flags")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body[0]._id).toBe(flag2._id.toString());
    expect(response.body[1]._id).toBe(flag1._id.toString());
  });

  it("should include all flag properties", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "complete-flag",
      name: "Complete Flag",
      description: "A flag with all fields",
      environments: {
        development: {
          enabled: true,
          phases: [
            {
              startDate: "2025-01-01T00:00:00.000Z",
              endDate: "2025-12-31T23:59:59.999Z",
              percentage: 50,
            },
          ],
          contextRules: {
            location: { oneOf: ["US", "EU"] },
          },
        },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .get("/api/flags")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0]).toMatchObject({
      flagKey: "complete-flag",
      name: "Complete Flag",
      description: "A flag with all fields",
      environments: {
        development: {
          enabled: true,
          phases: [
            {
              startDate: "2025-01-01T00:00:00.000Z",
              endDate: "2025-12-31T23:59:59.999Z",
              percentage: 50,
            },
          ],
          contextRules: {
            location: { oneOf: ["US", "EU"] },
          },
        },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });
    expect(response.body[0]).toHaveProperty("_id");
    expect(response.body[0]).toHaveProperty("organizationId");
    expect(response.body[0]).toHaveProperty("createdAt");
    expect(response.body[0]).toHaveProperty("updatedAt");
  });

  it("should only return flags for the current organization", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "org1-flag",
      name: "Org 1 Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    await Flag.create({
      organizationId: "000000000000000000000002",
      flagKey: "org2-flag",
      name: "Org 2 Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app)
      .get("/api/flags")
      .set("X-API-Key", TEST_API_KEY_DEV);

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(1);
    expect(response.body[0].flagKey).toBe("org1-flag");
  });
});
