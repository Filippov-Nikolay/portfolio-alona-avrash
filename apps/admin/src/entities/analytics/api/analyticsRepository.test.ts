import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    getEngagement,
    getOverview,
    getProjectDetail,
    getTopCategories,
    getTopProjects,
    getTraffic,
    isAnalyticsConfigured,
} from "./analyticsRepository";

describe("analyticsRepository", () => {
    beforeEach(() => {
        vi.stubEnv("ANALYTICS_WORKER_URL", "https://analytics.example.com");
        vi.stubEnv("ANALYTICS_READ_SECRET", "test-secret");
    });

    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
    });

    describe("isAnalyticsConfigured", () => {
        it("is true when both env vars are set", () => {
            expect(isAnalyticsConfigured()).toBe(true);
        });

        it("is false when either is missing", () => {
            vi.stubEnv("ANALYTICS_READ_SECRET", "");
            expect(isAnalyticsConfigured()).toBe(false);
        });
    });

    describe("getOverview", () => {
        it("returns null without hitting the network when not configured", async () => {
            vi.stubEnv("ANALYTICS_WORKER_URL", "");
            const fetchMock = vi.fn();
            vi.stubGlobal("fetch", fetchMock);

            expect(await getOverview(30)).toBeNull();
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it("sends the bearer token and days param, and returns the parsed body", async () => {
            const payload = { projectOpens: 5, contacts: 1, timeline: [] };
            const fetchMock = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => payload,
            });
            vi.stubGlobal("fetch", fetchMock);

            const result = await getOverview(30);

            expect(result).toEqual(payload);
            const [url, init] = fetchMock.mock.calls[0]!;
            expect(url).toBe("https://analytics.example.com/analytics/overview?days=30");
            expect(init.headers.Authorization).toBe("Bearer test-secret");
        });

        it("returns null when the worker responds with a non-ok status", async () => {
            vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false, status: 500 }));
            expect(await getOverview(30)).toBeNull();
        });

        it("returns null when the request itself throws", async () => {
            vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
            expect(await getOverview(30)).toBeNull();
        });
    });

    describe("getTopProjects", () => {
        it("requests the /analytics/projects path", async () => {
            const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
            vi.stubGlobal("fetch", fetchMock);

            await getTopProjects(7);

            expect(fetchMock.mock.calls[0]![0]).toBe(
                "https://analytics.example.com/analytics/projects?days=7"
            );
        });
    });

    describe("getTopCategories", () => {
        it("requests the /analytics/categories path", async () => {
            const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => [] });
            vi.stubGlobal("fetch", fetchMock);

            await getTopCategories(7);

            expect(fetchMock.mock.calls[0]![0]).toBe(
                "https://analytics.example.com/analytics/categories?days=7"
            );
        });
    });

    describe("getProjectDetail", () => {
        it("URL-encodes the entityId into the path", async () => {
            const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) });
            vi.stubGlobal("fetch", fetchMock);

            await getProjectDetail("crusty & co", 30);

            expect(fetchMock.mock.calls[0]![0]).toBe(
                "https://analytics.example.com/analytics/projects/crusty%20%26%20co?days=30"
            );
        });
    });

    describe("traffic and engagement", () => {
        it.each([
            ["getTraffic", getTraffic, "/analytics/traffic?days=90"],
            ["getEngagement", getEngagement, "/analytics/engagement?days=90"],
        ] as const)("%s reads its worker route with the bearer token", async (_, read, path) => {
            const payload = { ok: true };
            const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => payload });
            vi.stubGlobal("fetch", fetchMock);

            await expect(read(90)).resolves.toEqual(payload);
            const [url, init] = fetchMock.mock.calls[0]!;
            expect(url).toBe(`https://analytics.example.com${path}`);
            expect(init.headers.Authorization).toBe("Bearer test-secret");
        });
    });
});
