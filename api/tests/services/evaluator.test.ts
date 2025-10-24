import { randomUUID } from "node:crypto";

import { describe, expect, it } from "vitest";

import type { IEnvironmentConfig, IOperatorExpression } from "../../src/models/flag.model.js";
import { evaluateFlag } from "../../src/services/evaluator.js";

describe("evaluateFlag", () => {
  describe("flag enabled/disabled state", () => {
    it("should return disabled when flag is disabled", () => {
      const config: IEnvironmentConfig = {
        enabled: false,
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("flag_disabled");
    });

    it("should return enabled when flag is enabled with no phases or rules", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(true);
      expect(result.metadata.reason).toBe("flag_enabled");
    });

    it("should return disabled when flag is disabled regardless of phases", () => {
      const config: IEnvironmentConfig = {
        enabled: false,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("flag_disabled");
    });
  });

  describe("phase detection", () => {
    it("should find active phase when current time is within phase range", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            endDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(true);
      expect(result.metadata.reason).toBe("percentage_matched");
      expect(result.metadata.matchedPhase).toBeDefined();
    });

    it("should return disabled when phase has not started yet", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("no_active_phase");
    });

    it("should return disabled when phase has ended", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(),
            endDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("no_active_phase");
    });

    it("should find active phase without end date (infinite)", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(true);
      expect(result.metadata.reason).toBe("percentage_matched");
    });

    it("should select the first matching phase when multiple phases are active", () => {
      const phase1 = {
        startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
        endDate: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
        percentage: 50,
      };
      const phase2 = {
        startDate: new Date(Date.now() - 1000 * 60).toISOString(),
        endDate: new Date(Date.now() + 1000 * 60).toISOString(),
        percentage: 75,
      };

      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [phase1, phase2],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.metadata.matchedPhase).toEqual(phase1);
    });

    it("should handle phase at exact start time", () => {
      const startDate = new Date();
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: startDate.toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(true);
    });

    it("should handle phase at exact end time (endDate is exclusive)", () => {
      const endDate = new Date();
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            endDate: endDate.toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("no_active_phase");
    });

    it("should include phase when current time is just before endDate", () => {
      const endDate = new Date(Date.now() + 1000);
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            endDate: endDate.toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(true);
      expect(result.metadata.reason).toBe("percentage_matched");
    });
  });

  describe("deterministic percentage rollout", () => {
    it("should distribute users evenly across percentage rollouts", () => {
      const testCases = [
        { percentage: 10, tolerance: 2 },
        { percentage: 30, tolerance: 2 },
        { percentage: 50, tolerance: 2 },
        { percentage: 75, tolerance: 2 },
      ];

      for (const { percentage, tolerance } of testCases) {
        const config: IEnvironmentConfig = {
          enabled: true,
          phases: [
            {
              startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
              percentage,
            },
          ],
        };

        let enabledCount = 0;
        const iterations = 10000;

        for (let i = 0; i < iterations; i += 1) {
          const result = evaluateFlag("test-flag", config, { userId: randomUUID() });
          if (result.enabled) {
            enabledCount += 1;
          }
        }

        const actualPercentage = (enabledCount / iterations) * 100;

        expect(actualPercentage).toBeGreaterThanOrEqual(percentage - tolerance);
        expect(actualPercentage).toBeLessThanOrEqual(percentage + tolerance);
      }
    });

    it("should consistently return same result for same userId and flagKey", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 50,
          },
        ],
      };

      const result1 = evaluateFlag("test-flag", config, { userId: "user123" });
      const result2 = evaluateFlag("test-flag", config, { userId: "user123" });
      const result3 = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result1.enabled).toBe(result2.enabled);
      expect(result2.enabled).toBe(result3.enabled);
      expect(result1.metadata.bucket).toBe(result2.metadata.bucket);
      expect(result2.metadata.bucket).toBe(result3.metadata.bucket);
    });

    it("should return different buckets for different users", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 50,
          },
        ],
      };

      const result1 = evaluateFlag("test-flag", config, { userId: "user1" });
      const result2 = evaluateFlag("test-flag", config, { userId: "user2" });
      const result3 = evaluateFlag("test-flag", config, { userId: "user3" });

      const buckets = [result1.metadata.bucket, result2.metadata.bucket, result3.metadata.bucket];
      const uniqueBuckets = new Set(buckets);

      expect(uniqueBuckets.size).toBeGreaterThan(1);
    });

    it("should return different buckets for same user with different flags", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 50,
          },
        ],
      };

      const result1 = evaluateFlag("flag-a", config, { userId: "user123" });
      const result2 = evaluateFlag("flag-b", config, { userId: "user123" });

      expect(result1.metadata.bucket).not.toBe(result2.metadata.bucket);
    });

    it("should enable flag when bucket is less than percentage", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(true);
      expect(result.metadata.reason).toBe("percentage_matched");
      expect(result.metadata.bucket).toBeLessThan(100);
    });

    it("should disable flag when bucket equals or exceeds percentage", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 0,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("percentage_not_matched");
    });

    it("should calculate buckets in range 0-99", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
      };

      for (let i = 0; i < 100; i += 1) {
        const result = evaluateFlag("test-flag", config, { userId: `user${i}` });
        expect(result.metadata.bucket).toBeGreaterThanOrEqual(0);
        expect(result.metadata.bucket).toBeLessThan(100);
      }
    });
  });

  describe("context rule matching - equality operators", () => {
    it("should match eq operator with string value", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { eq: "US" },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "US",
      });

      expect(result.enabled).toBe(true);
    });

    it("should not match eq operator with different string value", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { eq: "US" },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "EU",
      });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("context_rules_not_matched");
    });

    it("should match eq operator with number value", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          accountAge: { eq: 30 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 30,
      });

      expect(result.enabled).toBe(true);
    });

    it("should match neq operator", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          deviceType: { neq: "mobile" },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        deviceType: "desktop",
      });

      expect(result.enabled).toBe(true);
    });

    it("should not match neq operator when values are equal", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          deviceType: { neq: "mobile" },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        deviceType: "mobile",
      });

      expect(result.enabled).toBe(false);
    });
  });

  describe("context rule matching - comparison operators", () => {
    it("should match gt operator", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          accountAge: { gt: 30 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 31,
      });

      expect(result.enabled).toBe(true);
    });

    it("should not match gt operator when equal", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          accountAge: { gt: 30 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 30,
      });

      expect(result.enabled).toBe(false);
    });

    it("should match gte operator when greater", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          accountAge: { gte: 30 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 31,
      });

      expect(result.enabled).toBe(true);
    });

    it("should match gte operator when equal", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          accountAge: { gte: 30 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 30,
      });

      expect(result.enabled).toBe(true);
    });

    it("should match lt operator", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          accountAge: { lt: 30 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 29,
      });

      expect(result.enabled).toBe(true);
    });

    it("should not match lt operator when equal", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          accountAge: { lt: 30 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 30,
      });

      expect(result.enabled).toBe(false);
    });

    it("should match lte operator when less", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          accountAge: { lte: 30 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 29,
      });

      expect(result.enabled).toBe(true);
    });

    it("should match lte operator when equal", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          accountAge: { lte: 30 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 30,
      });

      expect(result.enabled).toBe(true);
    });

    it("should handle range with multiple operators on same field", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          accountAge: { gte: 30, lt: 60 },
        },
      };

      const result1 = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 45,
      });
      expect(result1.enabled).toBe(true);

      const result2 = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 29,
      });
      expect(result2.enabled).toBe(false);

      const result3 = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: 60,
      });
      expect(result3.enabled).toBe(false);
    });
  });

  describe("context rule matching - array operators", () => {
    it("should match oneOf operator with string in array", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { oneOf: ["US", "EU", "UK"] },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "EU",
      });

      expect(result.enabled).toBe(true);
    });

    it("should not match oneOf operator with string not in array", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { oneOf: ["US", "EU", "UK"] },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "JP",
      });

      expect(result.enabled).toBe(false);
    });

    it("should match oneOf operator with number in array", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          planTier: { oneOf: [1, 2, 3] },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        planTier: 2,
      });

      expect(result.enabled).toBe(true);
    });

    it("should match notOneOf operator", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { notOneOf: ["BANNED_COUNTRY_1", "BANNED_COUNTRY_2"] },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "US",
      });

      expect(result.enabled).toBe(true);
    });

    it("should not match notOneOf operator when value is in array", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { notOneOf: ["BANNED_COUNTRY_1", "BANNED_COUNTRY_2"] },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "BANNED_COUNTRY_1",
      });

      expect(result.enabled).toBe(false);
    });
  });

  describe("context rule matching - edge cases", () => {
    it("should return disabled when context field is missing", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { eq: "US" },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
      });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("context_rules_not_matched");
    });

    it("should match when contextRules is undefined", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: undefined,
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
      });

      expect(result.enabled).toBe(true);
    });

    it("should match when contextRules is empty object", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {},
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
      });

      expect(result.enabled).toBe(true);
    });

    it("should require ALL rules to match (AND logic)", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { eq: "US" },
          planType: { eq: "premium" },
          accountAge: { gte: 30 },
        },
      };

      const result1 = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "US",
        planType: "premium",
        accountAge: 35,
      });
      expect(result1.enabled).toBe(true);

      const result2 = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "US",
        planType: "free",
        accountAge: 35,
      });
      expect(result2.enabled).toBe(false);

      const result3 = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "EU",
        planType: "premium",
        accountAge: 35,
      });
      expect(result3.enabled).toBe(false);
    });

    it("should handle context with extra fields not in rules", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { eq: "US" },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "US",
        extraField: "ignored",
        anotherField: 123,
      });

      expect(result.enabled).toBe(true);
    });

    it("should not match comparison operators with non-numeric context values", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          accountAge: { gt: 30 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        accountAge: "not-a-number",
      });

      expect(result.enabled).toBe(false);
    });

    it("should fail-safe to false when all operators are undefined", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { eq: undefined },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "US",
      });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("context_rules_not_matched");
    });
  });

  describe("combined evaluation flow", () => {
    it("should evaluate in correct order: enabled → phase → rules → percentage", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
        contextRules: {
          location: { eq: "US" },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "US",
      });

      expect(result.enabled).toBe(true);
      expect(result.metadata.reason).toBe("percentage_matched");
    });

    it("should short-circuit on disabled flag before checking rules", () => {
      const config: IEnvironmentConfig = {
        enabled: false,
        contextRules: {
          nonExistentField: { eq: "value" },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
      });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("flag_disabled");
    });

    it("should check rules before percentage calculation", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
        contextRules: {
          location: { eq: "US" },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "EU",
      });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("context_rules_not_matched");
      expect(result.metadata.bucket).toBeUndefined();
    });

    it("should handle flag with phases and no rules", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
      });

      expect(result.enabled).toBe(true);
      expect(result.metadata.reason).toBe("percentage_matched");
    });

    it("should handle flag with rules and no phases", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { eq: "US" },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "US",
      });

      expect(result.enabled).toBe(true);
      expect(result.metadata.reason).toBe("flag_enabled");
    });

    it("should handle complex real-world scenario", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            endDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
            percentage: 50,
          },
        ],
        contextRules: {
          location: { oneOf: ["US", "EU"] },
          accountAge: { gte: 30, lt: 60 },
          planType: { eq: "premium" },
          deviceType: { neq: "mobile" },
        },
      };

      const enabledUsers: number[] = [];
      const disabledUsers: number[] = [];

      for (let i = 0; i < 100; i += 1) {
        const result = evaluateFlag("premium-feature", config, {
          userId: `user${i}`,
          location: "US",
          accountAge: 45,
          planType: "premium",
          deviceType: "desktop",
        });

        if (result.enabled) {
          enabledUsers.push(i);
        } else {
          disabledUsers.push(i);
        }
      }

      expect(enabledUsers.length).toBeGreaterThan(0);
      expect(disabledUsers.length).toBeGreaterThan(0);
      expect(enabledUsers.length).toBeLessThan(100);
    });
  });

  describe("edge cases and boundary conditions", () => {
    it("should handle userId as empty string (consumer's bad data, we hash it)", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 50,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "" });

      expect(result.metadata.bucket).toBeDefined();
      expect(result.metadata.bucket).toBeGreaterThanOrEqual(0);
      expect(result.metadata.bucket).toBeLessThan(100);
    });

    it("should handle very long userId", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 50,
          },
        ],
      };

      const longUserId = "a".repeat(10000);
      const result = evaluateFlag("test-flag", config, { userId: longUserId });

      expect(result.metadata.bucket).toBeDefined();
      expect(result.metadata.bucket).toBeGreaterThanOrEqual(0);
      expect(result.metadata.bucket).toBeLessThan(100);
    });

    it("should handle special characters in userId", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 50,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user@email.com:123!#$%",
      });

      expect(result.metadata.bucket).toBeDefined();
    });

    it("should handle percentage of 0", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 0,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("percentage_not_matched");
    });

    it("should handle percentage of 100", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(true);
      expect(result.metadata.reason).toBe("percentage_matched");
    });

    it("should handle empty phases array", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(true);
      expect(result.metadata.reason).toBe("flag_enabled");
    });

    it("should handle zero value in context", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          value: { eq: 0 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        value: 0,
      });

      expect(result.enabled).toBe(true);
    });

    it("should handle negative numbers in context", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          balance: { lt: 0 },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        balance: -10,
      });

      expect(result.enabled).toBe(true);
    });

    it("should handle empty string in oneOf array", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          status: { oneOf: ["", "active", "pending"] },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        status: "",
      });

      expect(result.enabled).toBe(true);
    });

    it("should fail-safe to false when empty array in oneOf", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { oneOf: [] },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "US",
      });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("context_rules_not_matched");
    });

    it("should fail-safe correctly when empty array in notOneOf", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { notOneOf: [] },
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "US",
      });

      expect(result.enabled).toBe(true);
    });

    it("should fail-safe to false when unknown operator is present", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        contextRules: {
          location: { unknownOp: "US" } as unknown as IOperatorExpression,
        },
      };

      const result = evaluateFlag("test-flag", config, {
        userId: "user123",
        location: "US",
      });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("context_rules_not_matched");
    });

    it("should handle multiple phases with gap between them (no active phase)", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
            endDate: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(),
            percentage: 50,
          },
          {
            startDate: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
            endDate: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(),
            percentage: 75,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, { userId: "user123" });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("no_active_phase");
    });

    it("should return false when userId is missing with percentage < 100", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 50,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, {} as { userId?: string });

      expect(result.enabled).toBe(false);
      expect(result.metadata.reason).toBe("missing_user_id");
    });

    it("should return true when userId is missing but percentage is 100", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 100,
          },
        ],
      };

      const result = evaluateFlag("test-flag", config, {} as { userId?: string });

      expect(result.enabled).toBe(true);
      expect(result.metadata.reason).toBe("percentage_matched");
    });

    it("should handle very long flagKey", () => {
      const config: IEnvironmentConfig = {
        enabled: true,
        phases: [
          {
            startDate: new Date(Date.now() - 1000 * 60 * 60).toISOString(),
            percentage: 50,
          },
        ],
      };

      const longFlagKey = "a".repeat(10000);
      const result = evaluateFlag(longFlagKey, config, { userId: "user123" });

      expect(result.metadata.bucket).toBeDefined();
      expect(result.metadata.bucket).toBeGreaterThanOrEqual(0);
      expect(result.metadata.bucket).toBeLessThan(100);
    });
  });
});
