import { describe, expect, it } from "vitest";
import {
    buildEventRow,
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
