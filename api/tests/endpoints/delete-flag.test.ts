import request from "supertest";
import { describe, expect, it } from "vitest";

import { Flag } from "../../src/models/flag.model";
import { createApp } from "../../src/server";
import { setupTestDatabase } from "../setup-db";

describe("DELETE /api/flags/:key", () => {
  const app = createApp();

  setupTestDatabase();

  it("should delete an existing flag", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "test-flag",
      name: "Test Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app).delete("/api/flags/test-flag");

    expect(response.status).toBe(204);
    expect(response.body).toEqual({});

    const flag = await Flag.findOne({
      organizationId: "000000000000000000000001",
      flagKey: "test-flag",
    });
    expect(flag).toBeNull();
  });

  it("should return 404 when flag does not exist", async () => {
    const response = await request(app).delete("/api/flags/non-existent");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      title: "Not Found",
      detail: "Flag with key 'non-existent' not found",
    });
  });

  it("should not delete flags from other organizations", async () => {
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

    const response = await request(app).delete("/api/flags/other-org-flag");

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({
      title: "Not Found",
      detail: "Flag with key 'other-org-flag' not found",
    });

    const flag = await Flag.findOne({
      organizationId: "000000000000000000000002",
      flagKey: "other-org-flag",
    });
    expect(flag).not.toBeNull();
  });

  it("should delete flag with complex configuration", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "complex-flag",
      name: "Complex Flag",
      description: "A complex flag with phases and rules",
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
        staging: { enabled: false },
        production: { enabled: true },
      },
    });

    const response = await request(app).delete("/api/flags/complex-flag");

    expect(response.status).toBe(204);

    const flag = await Flag.findOne({
      organizationId: "000000000000000000000001",
      flagKey: "complex-flag",
    });
    expect(flag).toBeNull();
  });

  it("should allow deleting and recreating the same flag key", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "recreate-flag",
      name: "Original Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const deleteResponse = await request(app).delete("/api/flags/recreate-flag");
    expect(deleteResponse.status).toBe(204);

    const createResponse = await request(app)
      .post("/api/flags")
      .send({
        flagKey: "recreate-flag",
        name: "Recreated Flag",
        environments: {
          development: { enabled: false },
          staging: { enabled: true },
          production: { enabled: false },
        },
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.name).toBe("Recreated Flag");
  });

  it("should return 404 when trying to delete the same flag twice", async () => {
    await Flag.create({
      organizationId: "000000000000000000000001",
      flagKey: "double-delete",
      name: "Double Delete Flag",
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const firstDelete = await request(app).delete("/api/flags/double-delete");
    expect(firstDelete.status).toBe(204);

    const secondDelete = await request(app).delete("/api/flags/double-delete");
    expect(secondDelete.status).toBe(404);
    expect(secondDelete.body).toMatchObject({
      title: "Not Found",
      detail: "Flag with key 'double-delete' not found",
    });
  });

  it("should not affect other flags when deleting one", async () => {
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
      environments: {
        development: { enabled: true },
        staging: { enabled: false },
        production: { enabled: false },
      },
    });

    const response = await request(app).delete("/api/flags/flag-1");
    expect(response.status).toBe(204);

    const flag2 = await Flag.findOne({
      organizationId: "000000000000000000000001",
      flagKey: "flag-2",
    });
    expect(flag2).not.toBeNull();
    expect(flag2?.name).toBe("Flag 2");
  });
});
