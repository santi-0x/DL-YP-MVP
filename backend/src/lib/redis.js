import Redis from "ioredis";
import { env } from "../env.js";
export const redis = new Redis(env.redisUrl, {
    maxRetriesPerRequest: 1,
    connectTimeout: 2_000,
    lazyConnect: true,
    enableOfflineQueue: false,
    retryStrategy: () => null,
});
redis.on("error", () => {
    // Cache only. A closed socket must not crash the API.
});
let warned = false;
let downUntil = 0;
export async function cache(run) {
    if (Date.now() < downUntil)
        return null;
    try {
        if (redis.status === "wait" || redis.status === "end" || redis.status === "close") {
            await redis.connect();
        }
        if (redis.status !== "ready") {
            downUntil = Date.now() + 30_000;
            return null;
        }
        return await run(redis);
    }
    catch (error) {
        downUntil = Date.now() + 30_000;
        if (!warned) {
            warned = true;
            const message = error instanceof Error ? error.message : "redis unavailable";
            console.warn(`redis cache skipped (prices stay in memory): ${message}`);
        }
        return null;
    }
}
