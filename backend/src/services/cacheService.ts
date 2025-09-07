import { redisClient } from "./redisClient.js";

export class CacheService {
  private defaultTTL = 3600;

  async get<T>(key: string): Promise<T | null> {
    if (!redisClient.isReady()) {
      return null;
    }

    try {
      const client = redisClient.getClient();
      if (!client) return null;

      const data = await client.get(key);
      if (!data) {
        return null;
      }

      return JSON.parse(data) as T;
    } catch (error) {
      console.error(`❌ Cache GET error for ${key}:`, error);
      return null;
    }
  }

  async set(key: string, value: any, ttl?: number): Promise<void> {
    if (!redisClient.isReady()) {
      return;
    }

    try {
      const client = redisClient.getClient();
      if (!client) return;

      const serialized = JSON.stringify(value);
      const expiry = ttl || this.defaultTTL;

      await client.setEx(key, expiry, serialized);
    } catch (error) {
      console.error(`❌ Cache SET error for ${key}:`, error);
    }
  }

  /**
   * Delete a specific key
   */
  async del(key: string): Promise<void> {
    if (!redisClient.isReady()) {
      return;
    }

    try {
      const client = redisClient.getClient();
      if (!client) return;

      await client.del(key);
    } catch (error) {
      console.error(`❌ Cache DEL error for ${key}:`, error);
    }
  }

  /**
   * Invalidate all keys matching a pattern
   */
  async invalidatePattern(pattern: string): Promise<void> {
    if (!redisClient.isReady()) {
      return;
    }

    try {
      const client = redisClient.getClient();
      if (!client) return;

      const keys = await client.keys(pattern);
      if (keys.length > 0) {
        await client.del(keys);
      }
    } catch (error) {
      console.error(
        `❌ Cache invalidation error for pattern ${pattern}:`,
        error
      );
    }
  }

  async cacheUserSession(userId: string, userData: any): Promise<void> {
    const key = `user_session:${userId}`;
    const ttl = 900;
    await this.set(key, userData, ttl);
  }

  async getUserSession(userId: string): Promise<any> {
    const key = `user_session:${userId}`;
    return await this.get(key);
  }

  async cacheLeaveBalance(
    userId: string,
    year: number,
    balance: any
  ): Promise<void> {
    const key = `leave_balance:${userId}:${year}`;
    const ttl = 3600;
    await this.set(key, balance, ttl);
  }

  async getLeaveBalance(userId: string, year: number): Promise<any> {
    const key = `leave_balance:${userId}:${year}`;
    return await this.get(key);
  }

  async invalidateUserLeaveBalance(userId: string): Promise<void> {
    const pattern = `leave_balance:${userId}:*`;
    await this.invalidatePattern(pattern);
  }

  async cacheOrgSettings(orgId: string, settings: any): Promise<void> {
    const key = `org_settings:${orgId}`;
    const ttl = 86400;
    await this.set(key, settings, ttl);
  }

  async getOrgSettings(orgId: string): Promise<any> {
    const key = `org_settings:${orgId}`;
    return await this.get(key);
  }

  async cacheLeaveTypes(orgId: string, leaveTypes: any[]): Promise<void> {
    const key = `leave_types:${orgId}`;
    const ttl = 3600;
    await this.set(key, leaveTypes, ttl);
  }

  async getLeaveTypes(orgId: string): Promise<any[]> {
    const key = `leave_types:${orgId}`;
    return (await this.get(key)) || [];
  }

  async cacheApprovers(
    orgId: string,
    role: string,
    approvers: any[]
  ): Promise<void> {
    const key = `approvers:${orgId}:${role}`;
    const ttl = 3600;
    await this.set(key, approvers, ttl);
  }

  async getApprovers(orgId: string, role: string): Promise<any[]> {
    const key = `approvers:${orgId}:${role}`;
    return (await this.get(key)) || [];
  }

  async flushAll(): Promise<void> {
    if (!redisClient.isReady()) {
      return;
    }

    try {
      const client = redisClient.getClient();
      if (!client) return;

      await client.flushAll();
    } catch (error) {
      console.error("❌ Cache flush error:", error);
    }
  }

  /**
   * Invalidate all caches related to a user when their role/data changes
   */
  async invalidateUserCaches(userId: string): Promise<void> {
    const patterns = [
      `user_session:${userId}`,
      `leave_balance:${userId}:*`,
    ];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        await this.invalidatePattern(pattern);
      } else {
        await this.del(pattern);
      }
    }
  }

  /**
   * Invalidate all caches related to an organization when structure changes
   */
  async invalidateOrganizationCaches(orgId: string): Promise<void> {
    const patterns = [
      `org_settings:${orgId}`,
      `leave_types:${orgId}`,
      `approvers:${orgId}:*`,
    ];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        await this.invalidatePattern(pattern);
      } else {
        await this.del(pattern);
      }
    }
  }

  /**
   * Complete invalidation when user role changes (affects both user and org)
   */
  async invalidateOnRoleChange(userId: string, orgId: string): Promise<void> {
    await Promise.all([
      this.invalidateUserCaches(userId),
      this.invalidateOrganizationCaches(orgId)
    ]);
  }

  /**
   * Invalidate caches when leave types change (affects leave balances)
   */
  async invalidateOnLeaveTypesChange(orgId: string): Promise<void> {
    const patterns = [
      `leave_types:${orgId}`,
      `leave_balance:*:*`, // All user leave balances (since types affect calculations)
    ];

    for (const pattern of patterns) {
      if (pattern.includes('*')) {
        await this.invalidatePattern(pattern);
      } else {
        await this.del(pattern);
      }
    }
  }
}

export const cacheService = new CacheService();
