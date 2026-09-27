import { describe, expect, it } from "vitest";
import {
    buildEventRow,
    deleteEventsBefore,
    insertEvent,
    isSessionRateLimited,
    wasRecentlyTracked,
    type AnalyticsEventRow,
    type D1Like,
} from "./db";
import type { AnalyticsEventBody } from "./schema";

function createFakeDb(initialRows: AnalyticsEventRow[] = []) {
    const rows = [...initialRows];

    const db: D1Like = {
        prepare(query: string) {
            return {
                bind(...values: unknown[]) {
                    return {
                        async run() {
                            if (query.startsWith("INSERT")) {
                                const [
                                    id,
                                    eventName,
                                    entityId,
                                    path,
                                    locale,
                                    sessionId,
                                    country,
                                    referrer,
                                    createdAt,
                                ] = values as [
                                    string,
                                    string,
                                    string | null,
                                    string,
                                    string,
                                    string,
                                    string | null,
                                    string | null,
                                    number,
                                ];
                                rows.push({
                                    id,
                                    eventName,
                                    entityId,
                                    path,
                                    locale,
                                    sessionId,
                                    country,
                                    referrer,
                                    createdAt,
                                    visitorId: (values[9] ?? null) as string | null,
                                    device: (values[10] ?? null) as string | null,
                                    os: (values[11] ?? null) as string | null,
                                    browser: (values[12] ?? null) as string | null,
                                    utmSource: (values[13] ?? null) as string | null,
                                    utmMedium: (values[14] ?? null) as string | null,
                                    utmCampaign: (values[15] ?? null) as string | null,
                                    utmContent: (values[16] ?? null) as string | null,
                                });
                            }
                        },
                        async first<T>() {
                            if (query.includes("SELECT id")) {
                                const [sessionId, eventName, entityId, since] = values as [
                                    string,
                                    string,
                                    string,
                                    number,
                                ];
                                const match = rows.find(
                                    (row) =>
                                        row.sessionId === sessionId &&
                                        row.eventName === eventName &&
                                        row.entityId === entityId &&
                                        row.createdAt > since
                                );
                                return (match ? { id: match.id } : null) as T | null;
                            }
                            if (query.includes("COUNT(*)")) {
                                const [sessionId, since] = values as [string, number];
                                const count = rows.filter(
                                    (row) => row.sessionId === sessionId && row.createdAt > since
                                ).length;
                                return { count } as T;
                            }
                            return null;
                        },
                        async all<T>() {
                            return { results: [] as T[] };
                        },
                    };
                },
            };
        },
    };

    return { db, rows };
}

const BASE_BODY: AnalyticsEventBody = {
    eventName: "project_open",
    entityId: "crusty",
    path: "/en/works",
    locale: "en",
    sessionId: "84f3c1a2-1111-4111-8111-000000000000",
    referrer: "https://google.com",
};

describe("buildEventRow", () => {
    it("carries the body fields through, with entityId/referrer null when absent", () => {
        const { entityId, referrer, ...rest } = BASE_BODY;
        const row = buildEventRow(rest as AnalyticsEventBody, {
            country: "FI",
            visitorId: null,
            client: null,
        });
        expect(row.entityId).toBeNull();
        expect(row.referrer).toBeNull();
        expect(row.country).toBe("FI");
        expect(row.eventName).toBe("project_open");
        expect(row.id).toBeTruthy();
    });
});

describe("wasRecentlyTracked", () => {
    it("returns false with no matching rows", async () => {
        const { db } = createFakeDb();
        await expect(wasRecentlyTracked(db, BASE_BODY)).resolves.toBe(false);
    });

    it("returns false when the row has no entityId", async () => {
        const { db } = createFakeDb();
        await expect(wasRecentlyTracked(db, { ...BASE_BODY, entityId: undefined })).resolves.toBe(
            false
        );
    });

    it("returns true for a matching event tracked inside the dedupe window", async () => {
        const row = buildEventRow(BASE_BODY, { country: null, visitorId: null, client: null });
        const { db } = createFakeDb([{ ...row, createdAt: Date.now() - 5 * 60 * 1000 }]);
        await expect(wasRecentlyTracked(db, BASE_BODY)).resolves.toBe(true);
    });

    it("returns false once the matching event is outside the dedupe window", async () => {
        const row = buildEventRow(BASE_BODY, { country: null, visitorId: null, client: null });
        const { db } = createFakeDb([{ ...row, createdAt: Date.now() - 31 * 60 * 1000 }]);
        await expect(wasRecentlyTracked(db, BASE_BODY)).resolves.toBe(false);
    });

    it("does not match a different entity in the same session", async () => {
        const row = buildEventRow(
            { ...BASE_BODY, entityId: "esencha" },
            { country: null, visitorId: null, client: null }
        );
        const { db } = createFakeDb([{ ...row, createdAt: Date.now() }]);
        await expect(wasRecentlyTracked(db, BASE_BODY)).resolves.toBe(false);
    });
});

describe("isSessionRateLimited", () => {
    it("returns false under the threshold", async () => {
        const rows = Array.from({ length: 5 }, () =>
            buildEventRow(BASE_BODY, { country: null, visitorId: null, client: null })
        );
        const { db } = createFakeDb(rows);
        await expect(isSessionRateLimited(db, BASE_BODY.sessionId)).resolves.toBe(false);
    });

    it("returns true at the threshold", async () => {
        const rows = Array.from({ length: 20 }, () =>
            buildEventRow(BASE_BODY, { country: null, visitorId: null, client: null })
        );
        const { db } = createFakeDb(rows);
        await expect(isSessionRateLimited(db, BASE_BODY.sessionId)).resolves.toBe(true);
    });

    it("ignores events outside the rate limit window", async () => {
        const rows = Array.from({ length: 20 }, () => ({
            ...buildEventRow(BASE_BODY, { country: null, visitorId: null, client: null }),
            createdAt: Date.now() - 2 * 60 * 1000,
        }));
        const { db } = createFakeDb(rows);
        await expect(isSessionRateLimited(db, BASE_BODY.sessionId)).resolves.toBe(false);
    });
});

describe("insertEvent", () => {
    it("appends the row", async () => {
        const { db, rows } = createFakeDb();
        const row = buildEventRow(BASE_BODY, { country: "FI", visitorId: null, client: null });
        await insertEvent(db, row);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toEqual(row);
    });
});
describe("client context", () => {
    it("stores the visitor hash and device details with the event", async () => {
        const { db, rows } = createFakeDb();
        const row = buildEventRow(
            { ...BASE_BODY, eventName: "page_view", entityId: undefined },
            {
                country: "PL",
                visitorId: "a".repeat(32),
                client: { device: "mobile", os: "iOS", browser: "Safari" },
            }
        );
        await insertEvent(db, row);
        expect(rows[0]).toMatchObject({
            eventName: "page_view",
            country: "PL",
            visitorId: "a".repeat(32),
            device: "mobile",
            os: "iOS",
            browser: "Safari",
        });
    });
});

describe("campaign attribution", () => {
    it("stores the allowlisted UTM values with the event", async () => {
        const { db, rows } = createFakeDb();
        const row = buildEventRow(
            {
                ...BASE_BODY,
                eventName: "page_view",
                entityId: undefined,
                utm: { source: "instagram", medium: "social", campaign: "spring", content: "bio" },
            },
            { country: null, visitorId: null, client: null }
        );
        await insertEvent(db, row);
        expect(rows[0]).toMatchObject({
            utmSource: "instagram",
            utmMedium: "social",
            utmCampaign: "spring",
            utmContent: "bio",
        });
    });

    it("leaves the UTM columns empty when the event carries none", () => {
        const row = buildEventRow(BASE_BODY, { country: null, visitorId: null, client: null });
        expect(row).toMatchObject({
            utmSource: null,
            utmMedium: null,
            utmCampaign: null,
            utmContent: null,
        });
    });
});

describe("wasRecentlyTracked outside the deduped events", () => {
    it("never treats repeated outbound clicks as duplicates", async () => {
        for (const eventName of ["social_click", "project_external_click"] as const) {
            const body = { ...BASE_BODY, eventName };
            const row = buildEventRow(body, { country: null, visitorId: null, client: null });
            const { db } = createFakeDb([{ ...row, createdAt: Date.now() - 60 * 1000 }]);
            await expect(wasRecentlyTracked(db, body)).resolves.toBe(false);
        }
    });
});

describe("deleteEventsBefore", () => {
    it("deletes by created_at with the given cutoff", async () => {
        const calls: { query: string; values: unknown[] }[] = [];
        const db: D1Like = {
            prepare(query) {
                return {
                    bind(...values) {
                        calls.push({ query, values });
                        return {
                            async run() {},
                            async first() {
                                return null;
                            },
                            async all() {
                                return { results: [] };
                            },
                        };
                    },
                };
            },
        };
        await deleteEventsBefore(db, 1234);
        expect(calls).toEqual([
            { query: "DELETE FROM analytics_events WHERE created_at < ?", values: [1234] },
        ]);
    });
});
