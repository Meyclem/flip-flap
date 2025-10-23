import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/server";
import { setupTestDatabase } from "../setup-db";

describe("POST /api/flags", () => {
  const app = createApp();

  setupTestDatabase();

  it("should create a new flag with valid data", async () => {
    const flagData = {
      flagKey: "test-feature",
      name: "Test Feature",
      description: "A test feature flag",
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
        },
        staging: {
          enabled: false,
        },
        production: {
          enabled: false,
        },
      },
    };

    const response = await request(app).post("/api/flags")
      .send(flagData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty("_id");
    expect(response.body.flagKey).toBe("test-feature");
    expect(response.body.name).toBe("Test Feature");
    expect(response.body.description).toBe("A test feature flag");
    expect(response.body.environments.development.enabled).toBe(true);
    expect(response.body.environments.staging.enabled).toBe(false);
    expect(response.body.environments.production.enabled).toBe(false);
  });

  it("should reject duplicate flag key in same organization", async () => {
    const flagData = {
      flagKey: "duplicate-feature",
      name: "Duplicate Feature",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    };

    await request(app).post("/api/flags")
      .send(flagData);

    const response = await request(app).post("/api/flags")
      .send(flagData);

    expect(response.status).toBe(409);
    expect(response.body).toHaveProperty("error");
    expect(response.body.error).toContain("already exists");
  });

  it("should reject invalid flag key format", async () => {
    const flagData = {
      flagKey: "Invalid Key With Spaces",
      name: "Invalid Feature",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    };

    const response = await request(app).post("/api/flags")
      .send(flagData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Validation failed");
    expect(response.body).toHaveProperty("details");
  });

  it("should reject missing required fields", async () => {
    const flagData = {
      flagKey: "incomplete-feature",
    };

    const response = await request(app).post("/api/flags")
      .send(flagData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Validation failed");
    expect(response.body).toHaveProperty("details");
  });

  it("should reject overlapping phase date ranges", async () => {
    const flagData = {
      flagKey: "overlapping-phases",
      name: "Overlapping Phases Feature",
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
    };

    const response = await request(app).post("/api/flags")
      .send(flagData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Validation failed");
    expect(response.body.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          message: "Phase date ranges must not overlap",
        }),
      ]),
    );
  });

  it("should accept flag with context rules", async () => {
    const flagData = {
      flagKey: "context-feature",
      name: "Context Feature",
      environments: {
        development: {
          enabled: true,
          contextRules: {
            accountAge: { gte: 30, lt: 60 },
            location: { oneOf: ["US", "EU"] },
            planType: { eq: "premium" },
          },
        },
        staging: { enabled: false },
        production: { enabled: false },
      },
    };

    const response = await request(app).post("/api/flags")
      .send(flagData);

    expect(response.status).toBe(201);
    expect(response.body.environments.development.contextRules).toEqual({
      accountAge: { gte: 30, lt: 60 },
      location: { oneOf: ["US", "EU"] },
      planType: { eq: "premium" },
    });
  });

  it("should accept flag without optional fields", async () => {
    const flagData = {
      flagKey: "minimal-feature",
      name: "Minimal Feature",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    };

    const response = await request(app).post("/api/flags")
      .send(flagData);

    expect(response.status).toBe(201);
    expect(response.body.flagKey).toBe("minimal-feature");
    expect(response.body.description).toBeUndefined();
    expect(response.body.environments.development.phases).toEqual([]);
    expect(response.body.environments.development.contextRules).toBeUndefined();
  });

  it("should convert flag key to lowercase", async () => {
    const flagData = {
      flagKey: "UPPERCASE-FEATURE",
      name: "Uppercase Feature",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    };

    const response = await request(app).post("/api/flags")
      .send(flagData);

    expect(response.status).toBe(201);
    expect(response.body.flagKey).toBe("uppercase-feature");
  });

  it("should reject percentage outside 0-100 range", async () => {
    const flagData = {
      flagKey: "invalid-percentage",
      name: "Invalid Percentage",
      environments: {
        development: {
          enabled: true,
          phases: [
            {
              startDate: "2025-01-01T00:00:00.000Z",
              percentage: 150,
            },
          ],
        },
        staging: { enabled: false },
        production: { enabled: false },
      },
    };

    const response = await request(app).post("/api/flags")
      .send(flagData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty("error", "Validation failed");
  });

  it("should accept empty phases array", async () => {
    const flagData = {
      flagKey: "no-phases",
      name: "No Phases Feature",
      environments: {
        development: {
          enabled: true,
          phases: [],
        },
        staging: { enabled: false },
        production: { enabled: false },
      },
    };

    const response = await request(app).post("/api/flags")
      .send(flagData);

    expect(response.status).toBe(201);
    expect(response.body.environments.development.phases).toEqual([]);
  });
});
