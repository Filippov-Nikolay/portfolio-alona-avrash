import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const upstash = vi.hoisted(() => ({
    limit: vi.fn(),
    options: [] as Record<string, unknown>[],
    redisOptions: [] as Record<string, unknown>[],
}));

vi.mock("@upstash/ratelimit", () => ({
    Ratelimit: class {
        static slidingWindow(max: number, window: string) {
            return { max, window };
        }
        constructor(options: Record<string, unknown>) {
            upstash.options.push(options);
        }
        limit = upstash.limit;
    },
}));

vi.mock("@upstash/redis", () => ({
    Redis: class {
        constructor(options: Record<string, unknown>) {
            upstash.redisOptions.push(options);
        }
    },
}));

const { createRateLimiter } = await import("./rateLimiter");

const rule = { name: "login", max: 2, windowMs: 60_000 };

beforeEach(() => {
    upstash.limit.mockReset();
    upstash.options.length = 0;
    upstash.redisOptions.length = 0;
    vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
});

async function hits(limiter: ReturnType<typeof createRateLimiter>, count: number) {
    const results: boolean[] = [];
    for (let i = 0; i < count; i++) results.push(await limiter.isLimited("client"));
    return results;
}

describe("createRateLimiter", () => {
    it("counts in memory when no shared store is configured", async () => {
        expect(await hits(createRateLimiter(rule), 3)).toEqual([false, false, true]);
        expect(upstash.options).toHaveLength(0);
    });

    it("uses an Upstash sliding window shared by every instance when configured", async () => {
        vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
        vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
        upstash.limit.mockResolvedValue({ success: false });

        expect(await createRateLimiter(rule).isLimited("client")).toBe(true);
        expect(upstash.limit).toHaveBeenCalledWith("client");
        expect(upstash.options[0]).toMatchObject({
            limiter: { max: 2, window: "60000 ms" },
            prefix: "avrash:rate-limit:login",
        });
    });

    it("accepts the KV_* variables the Vercel integration provides", async () => {
        vi.stubEnv("KV_REST_API_URL", "https://kv.example");
        vi.stubEnv("KV_REST_API_TOKEN", "kv-token");
        upstash.limit.mockResolvedValue({ success: true });

        expect(await createRateLimiter(rule).isLimited("client")).toBe(false);
        expect(upstash.redisOptions[0]).toEqual({ url: "https://kv.example", token: "kv-token" });
    });

    it.each([
        ["times out", () => upstash.limit.mockResolvedValue({ success: true, reason: "timeout" })],
        ["fails", () => upstash.limit.mockRejectedValue(new Error("network down"))],
    ])("keeps limiting in memory when the shared store %s", async (_case, arrange) => {
        vi.stubEnv("UPSTASH_REDIS_REST_URL", "https://redis.example");
        vi.stubEnv("UPSTASH_REDIS_REST_TOKEN", "token");
        arrange();

        expect(await hits(createRateLimiter(rule), 3)).toEqual([false, false, true]);
    });
});
