import { Types } from "mongoose";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

import { Flag } from "../../src/models/flag.model";
import { cacheService } from "../../src/services/cache.service";
import { setupTestDatabase } from "../setup-db";

describe("CacheService", () => {
  setupTestDatabase();

  beforeEach(() => {
    cacheService.invalidate();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("loadAllFlags", () => {
    it("should load all flags into cache", async () => {
      await Flag.create([
        {
          organizationId: new Types.ObjectId(),
          flagKey: "flag-1",
          name: "Flag 1",
          environments: {
            development: { enabled: true },
            staging: { enabled: false },
            production: { enabled: false },
          },
        },
        {
          organizationId: new Types.ObjectId(),
          flagKey: "flag-2",
          name: "Flag 2",
          environments: {
            development: { enabled: false },
            staging: { enabled: false },
            production: { enabled: false },
          },
        },
      ]);

      await cacheService.loadAllFlags();

      expect(cacheService.getCacheSize()).toBe(2);
    });

    it("should clear existing cache before loading", async () => {
      await Flag.create({
        organizationId: new Types.ObjectId(),
        flagKey: "flag-1",
        name: "Flag 1",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await cacheService.loadAllFlags();
      expect(cacheService.getCacheSize()).toBe(1);

      await Flag.create({
        organizationId: new Types.ObjectId(),
        flagKey: "flag-2",
        name: "Flag 2",
        environments: {
          development: { enabled: false },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await cacheService.loadAllFlags();
      expect(cacheService.getCacheSize()).toBe(2);
    });

    it("should update last refresh timestamp", async () => {
      const beforeTime = Date.now();
      await cacheService.loadAllFlags();
      const afterTime = Date.now();

      const lastRefresh = cacheService.getLastRefreshTime();
      expect(lastRefresh).toBeGreaterThanOrEqual(beforeTime);
      expect(lastRefresh).toBeLessThanOrEqual(afterTime);
    });
  });

  describe("get", () => {
    it("should return cached flag on cache hit", async () => {
      const orgId = new Types.ObjectId();
      await Flag.create({
        organizationId: orgId,
        flagKey: "test-flag",
        name: "Test Flag",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await cacheService.loadAllFlags();

      const flag = await cacheService.get(orgId, "test-flag");
      expect(flag).toBeTruthy();
      expect(flag?.flagKey).toBe("test-flag");
    });

    it("should load from DB on cache miss and add to cache", async () => {
      const orgId = new Types.ObjectId();
      await Flag.create({
        organizationId: orgId,
        flagKey: "new-flag",
        name: "New Flag",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      expect(cacheService.getCacheSize()).toBe(0);

      const flag = await cacheService.get(orgId, "new-flag");
      expect(flag).toBeTruthy();
      expect(flag?.flagKey).toBe("new-flag");
    });

    it("should return null for non-existent flag", async () => {
      const orgId = new Types.ObjectId();
      await cacheService.loadAllFlags();

      const flag = await cacheService.get(orgId, "non-existent");
      expect(flag).toBeNull();
    });

    it("should isolate flags by organization", async () => {
      const orgA = new Types.ObjectId();
      const orgB = new Types.ObjectId();

      await Flag.create([
        {
          organizationId: orgA,
          flagKey: "feature-1",
          name: "Org A Feature 1",
          environments: {
            development: { enabled: true },
            staging: { enabled: false },
            production: { enabled: false },
          },
        },
        {
          organizationId: orgB,
          flagKey: "feature-1",
          name: "Org B Feature 1",
          environments: {
            development: { enabled: false },
            staging: { enabled: false },
            production: { enabled: false },
          },
        },
      ]);

      await cacheService.loadAllFlags();

      const flagA = await cacheService.get(orgA, "feature-1");
      const flagB = await cacheService.get(orgB, "feature-1");

      expect(flagA).toBeTruthy();
      expect(flagB).toBeTruthy();
      expect(flagA?.name).toBe("Org A Feature 1");
      expect(flagB?.name).toBe("Org B Feature 1");
      expect(flagA?.environments.development.enabled).toBe(true);
      expect(flagB?.environments.development.enabled).toBe(false);
    });

    it("should not return flag from different organization", async () => {
      const orgA = new Types.ObjectId();
      const orgB = new Types.ObjectId();

      await Flag.create({
        organizationId: orgA,
        flagKey: "org-a-flag",
        name: "Org A Flag",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await cacheService.loadAllFlags();

      const flag = await cacheService.get(orgB, "org-a-flag");
      expect(flag).toBeNull();
    });

    it("should cache multiple flags for the same organization", async () => {
      const orgId = new Types.ObjectId();

      await Flag.create([
        {
          organizationId: orgId,
          flagKey: "feature-1",
          name: "Feature 1",
          environments: {
            development: { enabled: true },
            staging: { enabled: false },
            production: { enabled: false },
          },
        },
        {
          organizationId: orgId,
          flagKey: "feature-2",
          name: "Feature 2",
          environments: {
            development: { enabled: false },
            staging: { enabled: true },
            production: { enabled: false },
          },
        },
        {
          organizationId: orgId,
          flagKey: "feature-3",
          name: "Feature 3",
          environments: {
            development: { enabled: true },
            staging: { enabled: true },
            production: { enabled: true },
          },
        },
      ]);

      await cacheService.loadAllFlags();

      const flag1 = await cacheService.get(orgId, "feature-1");
      const flag2 = await cacheService.get(orgId, "feature-2");
      const flag3 = await cacheService.get(orgId, "feature-3");

      expect(flag1?.name).toBe("Feature 1");
      expect(flag2?.name).toBe("Feature 2");
      expect(flag3?.name).toBe("Feature 3");
      expect(flag1?.environments.development.enabled).toBe(true);
      expect(flag2?.environments.staging.enabled).toBe(true);
      expect(flag3?.environments.production.enabled).toBe(true);
    });
  });

  describe("set", () => {
    it("should add new flag to cache", async () => {
      const orgId = new Types.ObjectId();
      const flag = await Flag.create({
        organizationId: orgId,
        flagKey: "new-flag",
        name: "New Flag",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      expect(cacheService.getCacheSize()).toBe(0);

      cacheService.set(orgId, "new-flag", flag);

      expect(cacheService.getCacheSize()).toBe(1);
      const cachedFlag = await cacheService.get(orgId, "new-flag");
      expect(cachedFlag?.name).toBe("New Flag");
    });

    it("should update existing flag in cache", async () => {
      const orgId = new Types.ObjectId();
      const flag = await Flag.create({
        organizationId: orgId,
        flagKey: "update-flag",
        name: "Old Name",
        environments: {
          development: { enabled: false },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await cacheService.loadAllFlags();
      const cachedBefore = await cacheService.get(orgId, "update-flag");
      expect(cachedBefore?.name).toBe("Old Name");

      flag.name = "New Name";
      flag.environments.development.enabled = true;
      await flag.save();

      cacheService.set(orgId, "update-flag", flag);

      const cachedAfter = await cacheService.get(orgId, "update-flag");
      expect(cachedAfter?.name).toBe("New Name");
      expect(cachedAfter?.environments.development.enabled).toBe(true);
    });
  });

  describe("delete", () => {
    it("should remove flag from cache", async () => {
      const orgId = new Types.ObjectId();
      await Flag.create({
        organizationId: orgId,
        flagKey: "delete-flag",
        name: "Delete Flag",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await cacheService.loadAllFlags();
      expect(cacheService.getCacheSize()).toBe(1);

      const deleted = cacheService.delete(orgId, "delete-flag");

      expect(deleted).toBe(true);
      expect(cacheService.getCacheSize()).toBe(0);
    });

    it("should return false when deleting non-existent flag", () => {
      const orgId = new Types.ObjectId();

      const deleted = cacheService.delete(orgId, "non-existent");

      expect(deleted).toBe(false);
    });

    it("should not affect other organization's flags", async () => {
      const orgA = new Types.ObjectId();
      const orgB = new Types.ObjectId();

      await Flag.create([
        {
          organizationId: orgA,
          flagKey: "flag-1",
          name: "Org A Flag",
          environments: {
            development: { enabled: true },
            staging: { enabled: false },
            production: { enabled: false },
          },
        },
        {
          organizationId: orgB,
          flagKey: "flag-1",
          name: "Org B Flag",
          environments: {
            development: { enabled: true },
            staging: { enabled: false },
            production: { enabled: false },
          },
        },
      ]);

      await cacheService.loadAllFlags();
      expect(cacheService.getCacheSize()).toBe(2);

      cacheService.delete(orgA, "flag-1");

      expect(cacheService.getCacheSize()).toBe(1);
      const orgBFlag = await cacheService.get(orgB, "flag-1");
      expect(orgBFlag?.name).toBe("Org B Flag");
    });
  });

  describe("invalidate", () => {
    it("should clear all cached flags", async () => {
      await Flag.create({
        organizationId: new Types.ObjectId(),
        flagKey: "flag-1",
        name: "Flag 1",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await cacheService.loadAllFlags();
      expect(cacheService.getCacheSize()).toBe(1);

      cacheService.invalidate();
      expect(cacheService.getCacheSize()).toBe(0);
    });

    it("should reset last refresh time", async () => {
      await cacheService.loadAllFlags();
      expect(cacheService.getLastRefreshTime()).toBeGreaterThan(0);

      cacheService.invalidate();
      expect(cacheService.getLastRefreshTime()).toBe(0);
    });
  });

  describe("TTL refresh", () => {
    it("should auto-refresh after TTL expires", async () => {
      vi.useFakeTimers();

      const orgId = new Types.ObjectId();
      await Flag.create({
        organizationId: orgId,
        flagKey: "flag-1",
        name: "Flag 1",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await cacheService.loadAllFlags();
      const initialRefreshTime = cacheService.getLastRefreshTime();

      vi.advanceTimersByTime(61 * 1000);

      await cacheService.get(orgId, "flag-1");
      const newRefreshTime = cacheService.getLastRefreshTime();

      expect(newRefreshTime).toBeGreaterThan(initialRefreshTime);

      vi.useRealTimers();
    });

    it("should not refresh before TTL expires", async () => {
      vi.useFakeTimers();

      const orgId = new Types.ObjectId();
      await Flag.create({
        organizationId: orgId,
        flagKey: "flag-1",
        name: "Flag 1",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await cacheService.loadAllFlags();
      const initialRefreshTime = cacheService.getLastRefreshTime();

      vi.advanceTimersByTime(30 * 1000);

      await cacheService.get(orgId, "flag-1");
      const newRefreshTime = cacheService.getLastRefreshTime();

      expect(newRefreshTime).toBe(initialRefreshTime);

      vi.useRealTimers();
    });
  });

  describe("refresh", () => {
    it("should reload all flags from database", async () => {
      await Flag.create({
        organizationId: new Types.ObjectId(),
        flagKey: "flag-1",
        name: "Flag 1",
        environments: {
          development: { enabled: true },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await cacheService.loadAllFlags();
      expect(cacheService.getCacheSize()).toBe(1);

      await Flag.create({
        organizationId: new Types.ObjectId(),
        flagKey: "flag-2",
        name: "Flag 2",
        environments: {
          development: { enabled: false },
          staging: { enabled: false },
          production: { enabled: false },
        },
      });

      await cacheService.refresh();
      expect(cacheService.getCacheSize()).toBe(2);
    });

    it("should not allow concurrent refreshes", async () => {
      const loadSpy = vi.spyOn(cacheService, "loadAllFlags");

      const refresh1 = cacheService.refresh();
      const refresh2 = cacheService.refresh();

      await Promise.all([refresh1, refresh2]);

      expect(loadSpy).toHaveBeenCalledTimes(1);
    });
  });
});
