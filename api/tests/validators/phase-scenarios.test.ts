import { describe, expect, it } from "vitest";

import {
  environmentConfigSchema,
} from "../../src/validators/flag.validator.js";

describe("Phase validation scenarios - all user requirements", () => {
  it("should accept date range without context", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [
        {
          startDate: "2025-01-01T00:00:00Z",
          endDate: "2025-02-01T00:00:00Z",
          percentage: 50,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept date range with context", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [
        {
          startDate: "2025-01-01T00:00:00Z",
          endDate: "2025-02-01T00:00:00Z",
          percentage: 50,
        },
      ],
      contextRules: {
        location: { oneOf: ["US", "EU"] },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept multiple phases with different percentages and context", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [
        {
          startDate: "2025-01-01T00:00:00Z",
          endDate: "2025-01-10T00:00:00Z",
          percentage: 30,
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
      contextRules: {
        planType: { eq: "premium" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept 50% without dates (auto-fills startDate)", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [
        {
          percentage: 50,
        },
      ],
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phases?.[0]?.startDate).toBeDefined();
      expect(result.data.phases?.[0]?.percentage).toBe(50);
    }
  });

  it("should accept 100% without dates", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [
        {
          percentage: 100,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept any percentage (25%) with context, no dates", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [
        {
          percentage: 25,
        },
      ],
      contextRules: {
        accountAge: { gte: 30 },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept 75% without context, no dates", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [
        {
          percentage: 75,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty phases array", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [],
    });
    expect(result.success).toBe(true);
  });

  it("should accept no phases (undefined)", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
    });
    expect(result.success).toBe(true);
  });

  it("should accept context rules without phases (100% for matching users)", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      contextRules: {
        location: { oneOf: ["US", "EU"] },
        planType: { eq: "premium" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept complex context rules without phases", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      contextRules: {
        accountAge: { gte: 30, lt: 90 },
        location: { oneOf: ["US", "CA", "UK", "EU"] },
        planType: { neq: "free" },
      },
    });
    expect(result.success).toBe(true);
  });

  it("should accept context rules with empty phases array", () => {
    const result = environmentConfigSchema.safeParse({
      enabled: true,
      phases: [],
      contextRules: {
        location: { eq: "US" },
      },
    });
    expect(result.success).toBe(true);
  });
});
