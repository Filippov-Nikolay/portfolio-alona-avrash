import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { createMemoryWindow } from "./memoryWindow";

const SHARED_STORE_TIMEOUT_MS = 1000;

export interface RateLimitRule {
    name: string;
    max: number;
    windowMs: number;
}

export interface RateLimiter {
    isLimited(key: string): Promise<boolean>;
}

function redisFromEnv(): Redis | null {
    const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
    return url && token ? new Redis({ url, token }) : null;
}

export function createRateLimiter({ name, max, windowMs }: RateLimitRule): RateLimiter {
    const memoryWindow = createMemoryWindow(max, windowMs);
    let sharedWindow: Ratelimit | null | undefined;

    function getSharedWindow(): Ratelimit | null {
        if (sharedWindow === undefined) {
            const redis = redisFromEnv();
            sharedWindow = redis
                ? new Ratelimit({
                      redis,
                      limiter: Ratelimit.slidingWindow(max, `${windowMs} ms`),
                      prefix: `avrash:rate-limit:${name}`,
                      timeout: SHARED_STORE_TIMEOUT_MS,
                      analytics: false,
                  })
                : null;
        }
        return sharedWindow;
    }

    return {
        async isLimited(key) {
            const shared = getSharedWindow();
            if (shared) {
                try {
                    const result = await shared.limit(key);
                    if (result.reason !== "timeout") return !result.success;
                    console.error(
                        `[rate-limit] ${name}: shared store timed out, counting in memory`
                    );
                } catch (error) {
                    console.error(
                        `[rate-limit] ${name}: shared store failed, counting in memory`,
                        error
                    );
                }
            }
            return memoryWindow(key);
        },
    };
}
