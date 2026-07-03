import { Redis, RedisOptions } from "ioredis";

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";

export let isRedisAvailable = false;

const redisOptions: RedisOptions = {
  maxRetriesPerRequest: null, // Required by BullMQ to function properly
  enableOfflineQueue: false, // Do not buffer commands if Redis is offline
  connectTimeout: 1500,
  retryStrategy(times) {
    // Attempt connection 3 times; if unsuccessful, fall back to in-memory mode
    if (times > 3) {
      console.warn("\n⚠️ Redis connection failed permanently. Falling back to In-Memory locks and queue schedulers.\n");
      isRedisAvailable = false;
      return null; // Stop retrying
    }
    return 1000;
  }
};

console.log(`🔌 Initializing shared Redis connection to: ${redisUrl}`);

export const redisConnection = new Redis(redisUrl, redisOptions);

redisConnection.on("connect", () => {
  isRedisAvailable = true;
  console.log("✅ Successfully connected to Redis server.");
});

redisConnection.on("error", (err) => {
  isRedisAvailable = false;
  // Prevent stack traces from logging continuously
  console.warn(`⚠️ Redis Connection Alert: Redis is offline or unreachable at ${redisUrl}.`);
});
