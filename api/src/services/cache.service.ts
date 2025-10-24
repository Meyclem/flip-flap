import type { Types } from "mongoose";

import { Flag } from "@/models/flag.model.js";
import type { IFlag } from "@/models/flag.model.js";

class CacheService {
  private cache: Map<string, IFlag>;
  private lastRefreshTime: number;
  private readonly TTL_MS = 60 * 1000;
  private isRefreshing: boolean;

  constructor() {
    this.cache = new Map();
    this.lastRefreshTime = 0;
    this.isRefreshing = false;
  }

  // eslint-disable-next-line class-methods-use-this
  private getCacheKey(organizationId: Types.ObjectId, flagKey: string): string {
    return `${organizationId.toString()}:${flagKey}`;
  }

  async loadAllFlags(): Promise<void> {
    try {
      const flags = await Flag.find({});
      this.cache.clear();

      for (const flag of flags) {
        const cacheKey = this.getCacheKey(flag.organizationId, flag.flagKey);
        this.cache.set(cacheKey, flag);
      }

      this.lastRefreshTime = Date.now();
      console.log("Cache loaded:", this.cache.size, "flags");
    } catch (error) {
      console.error("Failed to load flags into cache:", error);
      throw error;
    }
  }

  async get(organizationId: Types.ObjectId, flagKey: string): Promise<IFlag | null> {
    await this.checkAndRefresh();

    const cacheKey = this.getCacheKey(organizationId, flagKey);
    const cachedFlag = this.cache.get(cacheKey);

    if (cachedFlag) {
      return cachedFlag;
    }

    const flagFromDb = await Flag.findOne({ organizationId, flagKey });

    if (flagFromDb) {
      this.cache.set(cacheKey, flagFromDb);
    }

    return flagFromDb;
  }

  set(organizationId: Types.ObjectId, flagKey: string, flag: IFlag): void {
    const cacheKey = this.getCacheKey(organizationId, flagKey);
    this.cache.set(cacheKey, flag);
  }

  delete(organizationId: Types.ObjectId, flagKey: string): boolean {
    const cacheKey = this.getCacheKey(organizationId, flagKey);
    return this.cache.delete(cacheKey);
  }

  invalidate(): void {
    this.cache.clear();
    this.lastRefreshTime = 0;
    console.log("Cache invalidated");
  }

  async refresh(): Promise<void> {
    if (this.isRefreshing) {
      return;
    }

    this.isRefreshing = true;

    try {
      await this.loadAllFlags();
    } finally {
      this.isRefreshing = false;
    }
  }

  private async checkAndRefresh(): Promise<void> {
    const now = Date.now();
    const timeSinceRefresh = now - this.lastRefreshTime;

    if (timeSinceRefresh > this.TTL_MS && !this.isRefreshing) {
      await this.refresh();
    }
  }

  getCacheSize(): number {
    return this.cache.size;
  }

  getLastRefreshTime(): number {
    return this.lastRefreshTime;
  }
}

export const cacheService = new CacheService();
