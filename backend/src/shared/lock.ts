import { redisConnection, isRedisAvailable } from "./redis.js";
import { randomUUID } from "crypto";

export class LockManager {
  private static lockValues = new Map<string, string>();
  private static memoryLocks = new Set<string>();

  /**
   * Acquires a lock on a resource for a specified TTL (in milliseconds).
   * Automatically falls back to in-memory locking if Redis is unavailable.
   */
  static async acquireLock(
    resource: string,
    ttlMs: number = 8000,
    maxRetries: number = 3,
    retryDelayMs: number = 400
  ): Promise<boolean> {
    const lockKey = `lock:${resource}`;

    // 1. In-Memory Fallback Mode
    if (!isRedisAvailable) {
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        if (!this.memoryLocks.has(lockKey)) {
          this.memoryLocks.add(lockKey);
          // Auto release after TTL
          setTimeout(() => {
            if (this.memoryLocks.has(lockKey)) {
              this.memoryLocks.delete(lockKey);
              console.log(`🔓 [In-Memory Lock] Auto-released lock: ${resource}`);
            }
          }, ttlMs);
          console.log(`🔒 [In-Memory Lock] Lock ACQUIRED: ${resource} (Attempt ${attempt})`);
          return true;
        }

        if (attempt < maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        }
      }
      console.warn(`⚠️ [In-Memory Lock] Lock FAILED: ${resource} after ${maxRetries} attempts.`);
      return false;
    }

    // 2. Redis Locking Mode
    const token = randomUUID();
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await (redisConnection.set as any)(lockKey, token, "NX", "PX", ttlMs);
        if (result === "OK") {
          this.lockValues.set(lockKey, token);
          console.log(`🔒 [Redis Lock] Lock ACQUIRED: ${resource} (Attempt ${attempt})`);
          return true;
        }
      } catch (err) {
        console.warn(`⚠️ Redis lock acquisition failed, falling back to In-Memory for resource: ${resource}`);
        if (!this.memoryLocks.has(lockKey)) {
          this.memoryLocks.add(lockKey);
          setTimeout(() => this.memoryLocks.delete(lockKey), ttlMs);
          return true;
        }
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
      }
    }

    console.warn(`⚠️ [Redis Lock] Lock FAILED: ${resource} after ${maxRetries} attempts.`);
    return false;
  }

  /**
   * Releases the lock on a resource.
   */
  static async releaseLock(resource: string): Promise<boolean> {
    const lockKey = `lock:${resource}`;

    // 1. Release In-Memory Lock
    if (!isRedisAvailable || this.memoryLocks.has(lockKey)) {
      if (this.memoryLocks.has(lockKey)) {
        this.memoryLocks.delete(lockKey);
        console.log(`🔓 [In-Memory Lock] Lock RELEASED: ${resource}`);
        return true;
      }
    }

    // 2. Release Redis Lock
    const token = this.lockValues.get(lockKey);
    if (!token) return false;

    const luaScript = `
      if redis.call("get", KEYS[1]) == ARGV[1] then
        return redis.call("del", KEYS[1])
      else
        return 0
      end
    `;

    try {
      const result = await redisConnection.eval(luaScript, 1, lockKey, token);
      this.lockValues.delete(lockKey);
      if (result === 1) {
        console.log(`🔓 [Redis Lock] Lock RELEASED: ${resource}`);
        return true;
      }
      console.warn(`⚠️ [Redis Lock] Release token mismatch or expired: ${resource}`);
      return false;
    } catch (err) {
      console.warn(`⚠️ Redis release lock command failed. Purging local key: ${resource}`);
      this.lockValues.delete(lockKey);
      return false;
    }
  }
}
