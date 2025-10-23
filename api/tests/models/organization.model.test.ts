import { describe, expect, it } from "vitest";

import { Organization } from "../../src/models/organization.model.js";
import { setupTestDatabase } from "../setup-db.js";

setupTestDatabase();

describe("Organization Model", () => {
  it("should create a valid organization", async () => {
    const org = await Organization.create({
      name: "Test Organization",
    });

    expect(org.name).toBe("Test Organization");
    expect(org._id).toBeDefined();
  });

  it("should trim organization name", async () => {
    const org = await Organization.create({
      name: "  Trimmed Name  ",
    });

    expect(org.name).toBe("Trimmed Name");
  });

  it("should reject name exceeding maxlength", async () => {
    await expect(
      Organization.create({
        name: "a".repeat(201),
      }),
    ).rejects.toThrow();
  });

  it("should accept name at maxlength (200 chars)", async () => {
    const org = await Organization.create({
      name: "a".repeat(200),
    });

    expect(org.name).toHaveLength(200);
  });

  it("should set createdAt timestamp", async () => {
    const org = await Organization.create({
      name: "Timestamped Org",
    });

    expect(org.createdAt).toBeInstanceOf(Date);
  });

  it("should not have updatedAt field", async () => {
    const org = await Organization.create({
      name: "No Updates Org",
    });

    expect(org).not.toHaveProperty("updatedAt");
  });

  it("should require name field", async () => {
    await expect(Organization.create({})).rejects.toThrow();
  });

  it("should allow duplicate names", async () => {
    const org1 = await Organization.create({
      name: "Shared Name",
    });

    const org2 = await Organization.create({
      name: "Shared Name",
    });

    expect(org1.name).toBe(org2.name);
    expect(org1._id.toString()).not.toBe(org2._id.toString());
  });

  it("should have name index", async () => {
    const indexes = Organization.collection.getIndexes();
    const hasNameIndex = Object.keys(await indexes).some((key) =>
      key.includes("name"));
    expect(hasNameIndex).toBe(true);
  });

  it("should create multiple organizations", async () => {
    const org1 = await Organization.create({ name: "Org 1" });
    const org2 = await Organization.create({ name: "Org 2" });
    const org3 = await Organization.create({ name: "Org 3" });

    const count = await Organization.countDocuments();
    expect(count).toBe(3);
    expect([org1.name, org2.name, org3.name]).toEqual(["Org 1", "Org 2", "Org 3"]);
  });
});
