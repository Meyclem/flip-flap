import { describe, expect, it } from "vitest";

import { evaluateFlagSchema } from "../../src/validators/evaluate.validator.js";

describe("evaluateFlagSchema", () => {
  it("should accept valid evaluation request", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "premium-dashboard",
      context: {
        userId: "user_12345",
        accountAge: 45,
        location: "US",
        planType: "premium",
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept context with string values", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "test-flag",
      context: {
        userId: "user_123",
        location: "US",
        planType: "premium",
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept context with number values", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "test-flag",
      context: {
        userId: "user_123",
        accountAge: 30,
        loginCount: 150,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept context with boolean values", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "test-flag",
      context: {
        userId: "user_123",
        isPremium: true,
        isVerified: false,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept context with mixed value types", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "test-flag",
      context: {
        userId: "user_123",
        accountAge: 45,
        location: "US",
        isPremium: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty context", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "test-flag",
      context: {},
    });
    expect(result.success).toBe(true);
  });

  it("should reject missing flagKey", () => {
    const result = evaluateFlagSchema.safeParse({
      context: {
        userId: "user_123",
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing context", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "test-flag",
    });
    expect(result.success).toBe(false);
  });

  it("should reject empty flagKey", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "",
      context: {
        userId: "user_123",
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject context with array values", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "test-flag",
      context: {
        userId: "user_123",
        tags: ["tag1", "tag2"],
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject context with object values", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "test-flag",
      context: {
        userId: "user_123",
        metadata: { key: "value" },
      },
    });
    expect(result.success).toBe(false);
  });

  it("should reject context with null values", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "test-flag",
      context: {
        userId: "user_123",
        location: null,
      },
    });
    expect(result.success).toBe(false);
  });

  it("should accept context with custom field names", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "test-flag",
      context: {
        userId: "user_123",
        customField1: "value1",
        customField2: 42,
        anotherField: true,
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept minimal request with only userId", () => {
    const result = evaluateFlagSchema.safeParse({
      flagKey: "simple-flag",
      context: {
        userId: "user_123",
      },
    });
    expect(result.success).toBe(true);
  });
});
