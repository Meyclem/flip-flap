import { describe, expect, it } from "vitest";

import {
  createFlagSchema,
  environmentConfigSchema,
  operatorExpressionSchema,
  phaseSchema,
  updateFlagSchema,
} from "../../src/validators/flag.validator.js";

describe("operatorExpressionSchema", () => {
  it("should accept valid eq operator with string", () => {
    const result = operatorExpressionSchema.safeParse({ eq: "premium" });
    expect(result.success).toBe(true);
  });

  it("should accept valid eq operator with number", () => {
    const result = operatorExpressionSchema.safeParse({ eq: 42 });
    expect(result.success).toBe(true);
  });

  it("should accept multiple operators combined", () => {
    const result = operatorExpressionSchema.safeParse({
      gte: 30,
      lt: 60,
    });
    expect(result.success).toBe(true);
  });

  it("should accept oneOf with array of strings", () => {
    const result = operatorExpressionSchema.safeParse({
      oneOf: ["US", "EU", "UK"],
    });
    expect(result.success).toBe(true);
  });

  it("should accept notOneOf with array of numbers", () => {
    const result = operatorExpressionSchema.safeParse({
      notOneOf: [1, 2, 3],
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty object (all operators optional)", () => {
    const result = operatorExpressionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should accept all operators at once", () => {
    const result = operatorExpressionSchema.safeParse({
      eq: "value",
      neq: "other",
      gt: 10,
      gte: 5,
      lt: 100,
      lte: 99,
      oneOf: ["a", "b"],
      notOneOf: ["c", "d"],
    });
    expect(result.success).toBe(true);
  });
});

describe("phaseSchema", () => {
  it("should accept valid phase with endDate", () => {
    const result = phaseSchema.safeParse({
      startDate: "2025-01-01T00:00:00Z",
      endDate: "2025-01-31T23:59:59Z",
      percentage: 50,
    });
    expect(result.success).toBe(true);
  });

  it("should accept phase without endDate (indefinite)", () => {
    const result = phaseSchema.safeParse({
      startDate: "2025-01-01T00:00:00Z",
      percentage: 100,
    });
    expect(result.success).toBe(true);
  });

  it("should reject phase with null endDate", () => {
    const result = phaseSchema.safeParse({
      startDate: "2025-01-01T00:00:00Z",
      endDate: null,
      percentage: 75,
    });
    expect(result.success).toBe(false);
  });

  it("should reject percentage below 0", () => {
    const result = phaseSchema.safeParse({
      startDate: "2025-01-01T00:00:00Z",
      percentage: -1,
    });
    expect(result.success).toBe(false);
  });

  it("should reject percentage above 100", () => {
    const result = phaseSchema.safeParse({
      startDate: "2025-01-01T00:00:00Z",
      percentage: 101,
    });
    expect(result.success).toBe(false);
  });

  it("should accept percentage boundaries (0 and 100)", () => {
    const result1 = phaseSchema.safeParse({
      startDate: "2025-01-01T00:00:00Z",
      percentage: 0,
    });
    const result2 = phaseSchema.safeParse({
      startDate: "2025-01-01T00:00:00Z",
      percentage: 100,
    });
    expect(result1.success).toBe(true);
    expect(result2.success).toBe(true);
  });

  it("should reject invalid datetime format", () => {
    const result = phaseSchema.safeParse({
      startDate: "2025-01-01",
      percentage: 50,
    });
    expect(result.success).toBe(false);
  });

  it("should accept valid ISO 8601 datetime", () => {
    const result = phaseSchema.safeParse({
      startDate: "2025-10-23T14:30:00.000Z",
      percentage: 50,
    });
    expect(result.success).toBe(true);
  });

  it("should use current timestamp as default startDate when omitted", () => {
    const beforeParse = new Date();
    const result = phaseSchema.safeParse({
      percentage: 50,
    });
    const afterParse = new Date();

    expect(result.success).toBe(true);
    if (result.success) {
      const parsedDate = new Date(result.data.startDate);
      expect(parsedDate.getTime()).toBeGreaterThanOrEqual(beforeParse.getTime());
      expect(parsedDate.getTime()).toBeLessThanOrEqual(afterParse.getTime());
    }
  });

  it("should allow percentage-only phase without dates", () => {
    const result = phaseSchema.safeParse({
      percentage: 100,
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startDate).toBeDefined();
      expect(result.data.endDate).toBeUndefined();
      expect(result.data.percentage).toBe(100);
    }
  });
});

describe("environmentConfigSchema", () => {
  it("should accept minimal valid config", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("should accept config with single phase", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [
        {
          startDate: "2025-01-01T00:00:00Z",
          endDate: "2025-01-31T23:59:59Z",
          percentage: 50,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept non-overlapping phases", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [
        {
          startDate: "2025-01-01T00:00:00Z",
          endDate: "2025-01-10T00:00:00Z",
          percentage: 25,
        },
        {
          startDate: "2025-01-10T00:00:00Z",
          endDate: "2025-01-20T00:00:00Z",
          percentage: 50,
        },
        {
          startDate: "2025-01-20T00:00:00Z",
          percentage: 100,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should reject overlapping phases", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [
        {
          startDate: "2025-01-01T00:00:00Z",
          endDate: "2025-01-10T00:00:00Z",
          percentage: 50,
        },
        {
          startDate: "2025-01-05T00:00:00Z",
          endDate: "2025-01-15T00:00:00Z",
          percentage: 75,
        },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("must not overlap");
    }
  });

  it("should reject phase overlapping with indefinite phase", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [
        {
          startDate: "2025-01-01T00:00:00Z",
          percentage: 50,
        },
        {
          startDate: "2025-01-10T00:00:00Z",
          endDate: "2025-01-20T00:00:00Z",
          percentage: 75,
        },
      ],
    });
    expect(result.success).toBe(false);
  });

  it("should accept empty phases array", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: false,
      phases: [],
    });
    expect(result.success).toBe(true);
  });

  it("should accept config with context rules", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      contextRules: {
        accountAge: { gte: 30, lt: 90 },
        location: { oneOf: ["US", "EU"] },
        planType: { eq: "premium" },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("createFlagSchema", () => {
  const validFlag = {
    flagKey: "test-feature",
    name: "Test Feature",
    description: "A test feature flag",
    environments: {
      development: { enabled: true },
      staging: { enabled: false },
      production: { enabled: false },
    },
  };

  it("should accept valid flag", () => {
    const result = createFlagSchema.safeParse(validFlag);
    expect(result.success).toBe(true);
  });

  it("should accept flag without description", () => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { description, ...flagWithoutDesc } = validFlag;
    const result = createFlagSchema.safeParse(flagWithoutDesc);
    expect(result.success).toBe(true);
  });

  it("should accept flagKey with lowercase letters", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      flagKey: "myfeature",
    });
    expect(result.success).toBe(true);
  });

  it("should accept flagKey with numbers", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      flagKey: "feature123",
    });
    expect(result.success).toBe(true);
  });

  it("should accept flagKey with hyphens", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      flagKey: "my-feature-flag",
    });
    expect(result.success).toBe(true);
  });

  it("should accept flagKey with underscores", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      flagKey: "my_feature_flag",
    });
    expect(result.success).toBe(true);
  });

  it("should accept and transform flagKey with uppercase letters to lowercase", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      flagKey: "MyFeature",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.flagKey).toBe("myfeature");
    }
  });

  it("should reject flagKey with spaces", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      flagKey: "my feature",
    });
    expect(result.success).toBe(false);
  });

  it("should reject flagKey with special characters", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      flagKey: "my@feature!",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty flagKey", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      flagKey: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject flagKey exceeding 100 characters", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      flagKey: "a".repeat(101),
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty name", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("should reject name exceeding 200 characters", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      name: "a".repeat(201),
    });
    expect(result.success).toBe(false);
  });

  it("should reject description exceeding 1000 characters", () => {
    const result = createFlagSchema.safeParse({
      ...validFlag,
      description: "a".repeat(1001),
    });
    expect(result.success).toBe(false);
  });

  it("should require all three environments", () => {
    const result = createFlagSchema.safeParse({
      flagKey: "test",
      name: "Test",
      environments: {
        development: { enabled: true },
      },
    });
    expect(result.success).toBe(false);
  });

  it("should accept complete flag with all features", () => {
    const result = createFlagSchema.safeParse({
      flagKey: "premium-dashboard",
      name: "Premium Dashboard",
      description: "New dashboard for premium users",
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
          ],
          contextRules: {
            accountAge: { gte: 30, lt: 90 },
            location: { oneOf: ["US", "EU"] },
            planType: { eq: "premium" },
          },
        },
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("updateFlagSchema", () => {
  it("should accept partial updates", () => {
    const result = updateFlagSchema.safeParse({
      name: "Updated Name",
    });
    expect(result.success).toBe(true);
  });

  it("should accept updating only description", () => {
    const result = updateFlagSchema.safeParse({
      description: "Updated description",
    });
    expect(result.success).toBe(true);
  });

  it("should accept updating environments", () => {
    const result = updateFlagSchema.safeParse({
      environments: {
        development: { enabled: false },
        staging: { enabled: true },
        production: { enabled: true },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty update object", () => {
    const result = updateFlagSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should not include flagKey field (omitted from schema)", () => {
    const result = updateFlagSchema.safeParse({
      flagKey: "new-key",
      name: "Test",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).not.toHaveProperty("flagKey");
    }
  });
});
