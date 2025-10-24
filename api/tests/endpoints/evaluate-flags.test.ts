import request from "supertest";
import { describe, expect, it } from "vitest";

import { createApp } from "../../src/server";
import { setupTestDatabase } from "../setup-db";

describe("POST /api/flags/evaluate", () => {
  const app = createApp();

  setupTestDatabase();

  describe("Single flag evaluation", () => {
    it("should evaluate enabled flag without phases or rules", async () => {
      await request(app).post("/api/flags")
        .send({
          flagKey: "simple-flag",
          name: "Simple Flag",
          environments: {
            development: { enabled: true },
            staging: { enabled: false },
            production: { enabled: false },
          },
        });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "simple-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        flagKey: "simple-flag",
        enabled: true,
        metadata: { reason: "flag_enabled" },
      });
    });

    it("should return disabled for disabled flag", async () => {
      await request(app).post("/api/flags")
        .send({
          flagKey: "disabled-flag",
          name: "Disabled Flag",
          environments: {
            development: { enabled: false },
            staging: { enabled: false },
            production: { enabled: false },
          },
        });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "disabled-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        flagKey: "disabled-flag",
        enabled: false,
        metadata: { reason: "flag_disabled" },
      });
    });

    it("should evaluate flag with percentage rollout", async () => {
      await request(app).post("/api/flags")
        .send({
          flagKey: "percentage-flag",
          name: "Percentage Flag",
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
            staging: { enabled: false },
            production: { enabled: false },
          },
        });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "percentage-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("flagKey", "percentage-flag");
      expect(response.body).toHaveProperty("enabled");
      expect(response.body.metadata).toHaveProperty("bucket");
      expect(typeof response.body.metadata.bucket).toBe("number");
      expect(response.body.metadata.bucket).toBeGreaterThanOrEqual(0);
      expect(response.body.metadata.bucket).toBeLessThan(100);
    });

    it("should be deterministic for same userId and flagKey", async () => {
      await request(app).post("/api/flags")
        .send({
          flagKey: "deterministic-flag",
          name: "Deterministic Flag",
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
            staging: { enabled: false },
            production: { enabled: false },
          },
        });

      const response1 = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "deterministic-flag",
          context: { userId: "user123" },
        });

      const response2 = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "deterministic-flag",
          context: { userId: "user123" },
        });

      expect(response1.body.enabled).toBe(response2.body.enabled);
      expect(response1.body.metadata.bucket).toBe(response2.body.metadata.bucket);
    });

    it("should evaluate flag with context rules", async () => {
      await request(app).post("/api/flags")
        .send({
          flagKey: "context-flag",
          name: "Context Flag",
          environments: {
            development: {
              enabled: true,
              contextRules: {
                location: { oneOf: ["US", "EU"] },
                accountAge: { gte: 30 },
              },
            },
            staging: { enabled: false },
            production: { enabled: false },
          },
        });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "context-flag",
          context: {
            userId: "user123",
            location: "US",
            accountAge: 45,
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        flagKey: "context-flag",
        enabled: true,
        metadata: { reason: "flag_enabled" },
      });
    });

    it("should return disabled when context rules do not match", async () => {
      await request(app).post("/api/flags")
        .send({
          flagKey: "context-mismatch-flag",
          name: "Context Mismatch Flag",
          environments: {
            development: {
              enabled: true,
              contextRules: {
                location: { oneOf: ["US", "EU"] },
              },
            },
            staging: { enabled: false },
            production: { enabled: false },
          },
        });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "context-mismatch-flag",
          context: {
            userId: "user123",
            location: "CN",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        flagKey: "context-mismatch-flag",
        enabled: false,
        metadata: { reason: "context_rules_not_matched" },
      });
    });

    it("should return disabled when required context field is missing", async () => {
      await request(app).post("/api/flags")
        .send({
          flagKey: "missing-context-flag",
          name: "Missing Context Flag",
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
        .post("/api/flags/evaluate")
        .send({
          flagKey: "missing-context-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        flagKey: "missing-context-flag",
        enabled: false,
        metadata: { reason: "context_rules_not_matched" },
      });
    });

    it("should combine percentage and context rules", async () => {
      await request(app).post("/api/flags")
        .send({
          flagKey: "combined-flag",
          name: "Combined Flag",
          environments: {
            development: {
              enabled: true,
              phases: [
                {
                  startDate: "2025-01-01T00:00:00.000Z",
                  endDate: "2025-12-31T23:59:59.999Z",
                  percentage: 100,
                },
              ],
              contextRules: {
                planType: { eq: "premium" },
              },
            },
            staging: { enabled: false },
            production: { enabled: false },
          },
        });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "combined-flag",
          context: {
            userId: "user123",
            planType: "premium",
          },
        });

      expect(response.status).toBe(200);
      expect(response.body.flagKey).toBe("combined-flag");
      expect(response.body.enabled).toBe(true);
      expect(response.body.metadata.reason).toBe("percentage_matched");
    });
  });

  describe("Fail-safe scenarios", () => {
    it("should return disabled for non-existing flag", async () => {
      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "non-existing-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        flagKey: "non-existing-flag",
        enabled: false,
        metadata: { reason: "flag_not_found" },
      });
    });

    it("should return disabled when userId missing for percentage rollout", async () => {
      await request(app).post("/api/flags")
        .send({
          flagKey: "no-userid-flag",
          name: "No UserId Flag",
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
            staging: { enabled: false },
            production: { enabled: false },
          },
        });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "no-userid-flag",
          context: {},
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        flagKey: "no-userid-flag",
        enabled: false,
        metadata: { reason: "missing_user_id" },
      });
    });

    it("should return disabled when no active phase", async () => {
      await request(app).post("/api/flags")
        .send({
          flagKey: "no-active-phase-flag",
          name: "No Active Phase Flag",
          environments: {
            development: {
              enabled: true,
              phases: [
                {
                  startDate: "2026-01-01T00:00:00.000Z",
                  endDate: "2026-12-31T23:59:59.999Z",
                  percentage: 100,
                },
              ],
            },
            staging: { enabled: false },
            production: { enabled: false },
          },
        });

      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "no-active-phase-flag",
          context: { userId: "user123" },
        });

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        flagKey: "no-active-phase-flag",
        enabled: false,
        metadata: { reason: "no_active_phase" },
      });
    });
  });

  describe("Validation errors", () => {
    it("should reject request with neither flagKey nor flagKeys", async () => {
      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          context: { userId: "user123" },
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("title", "Bad Request");
    });

    it("should reject request without context", async () => {
      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "test-flag",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("title", "Bad Request");
    });

    it("should reject invalid context type", async () => {
      const response = await request(app)
        .post("/api/flags/evaluate")
        .send({
          flagKey: "test-flag",
          context: "invalid",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty("title", "Bad Request");
    });
  });
});
