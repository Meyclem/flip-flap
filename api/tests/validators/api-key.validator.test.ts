import { describe, expect, it } from "vitest";

import { createApiKeySchema, environmentSchema } from "../../src/validators/api-key.validator.js";

describe("environmentSchema", () => {
  it("should accept development", () => {
    const result = environmentSchema.safeParse("development");
    expect(result.success).toBe(true);
  });

  it("should accept staging", () => {
    const result = environmentSchema.safeParse("staging");
    expect(result.success).toBe(true);
  });

  it("should accept production", () => {
    const result = environmentSchema.safeParse("production");
    expect(result.success).toBe(true);
  });

  it("should reject invalid environment", () => {
    const result = environmentSchema.safeParse("testing");
    expect(result.success).toBe(false);
  });

  it("should reject empty string", () => {
    const result = environmentSchema.safeParse("");
    expect(result.success).toBe(false);
  });
});

describe("createApiKeySchema", () => {
  it("should accept valid API key creation", () => {
    const result = createApiKeySchema.safeParse({
      environment: "production",
      description: "Production key for mobile app",
    });
    expect(result.success).toBe(true);
  });

  it("should accept API key without description", () => {
    const result = createApiKeySchema.safeParse({
      environment: "development",
    });
    expect(result.success).toBe(true);
  });

  it("should accept all valid environments", () => {
    const dev = createApiKeySchema.safeParse({ environment: "development" });
    const staging = createApiKeySchema.safeParse({ environment: "staging" });
    const prod = createApiKeySchema.safeParse({ environment: "production" });

    expect(dev.success).toBe(true);
    expect(staging.success).toBe(true);
    expect(prod.success).toBe(true);
  });

  it("should reject invalid environment", () => {
    const result = createApiKeySchema.safeParse({
      environment: "test",
      description: "Test key",
    });
    expect(result.success).toBe(false);
  });

  it("should reject missing environment", () => {
    const result = createApiKeySchema.safeParse({
      description: "Key without environment",
    });
    expect(result.success).toBe(false);
  });

  it("should reject description exceeding 500 characters", () => {
    const result = createApiKeySchema.safeParse({
      environment: "production",
      description: "a".repeat(501),
    });
    expect(result.success).toBe(false);
  });

  it("should accept description at 500 characters", () => {
    const result = createApiKeySchema.safeParse({
      environment: "production",
      description: "a".repeat(500),
    });
    expect(result.success).toBe(true);
  });

  it("should accept empty description string", () => {
    const result = createApiKeySchema.safeParse({
      environment: "staging",
      description: "",
    });
    expect(result.success).toBe(true);
  });
});
