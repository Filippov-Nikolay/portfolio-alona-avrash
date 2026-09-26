import { describe, expect, it } from "vitest";
import { handleEvent } from "./handleEvent";
import type { AnalyticsEventRow, D1Like } from "./db";

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

const VALID_BODY = {
    eventName: "project_open",
    entityId: "crusty",
    path: "/en/works",
    locale: "en",
    sessionId: "84f3c1a2-1111-4111-8111-000000000000",
    referrer: "https://google.com",
};

describe("handleEvent", () => {
    it("rejects a body that fails validation", async () => {
        const { db, rows } = createFakeDb();
        const result = await handleEvent({
            body: { eventName: "not_allowed" },
            country: null,
            visitorId: null,
            client: null,
            db,
        });
        expect(result.status).toBe(400);
        expect(rows).toHaveLength(0);
    });

    it("inserts a valid, first-time event", async () => {
        const { db, rows } = createFakeDb();
        const result = await handleEvent({
            body: VALID_BODY,
            country: "FI",
            visitorId: null,
            client: null,
            db,
        });
        expect(result.status).toBe(204);
        expect(rows).toHaveLength(1);
        expect(rows[0]).toMatchObject({
            eventName: "project_open",
            entityId: "crusty",
            country: "FI",
        });
    });

    it("does not insert a duplicate project_open within the dedupe window, but still returns 204", async () => {
        const { db, rows } = createFakeDb();
        await handleEvent({ body: VALID_BODY, country: null, visitorId: null, client: null, db });
        const result = await handleEvent({
            body: VALID_BODY,
            country: null,
            visitorId: null,
            client: null,
            db,
        });
        expect(result.status).toBe(204);
        expect(rows).toHaveLength(1);
    });

    it("stops inserting once a session is rate limited", async () => {
        const { db, rows } = createFakeDb();
        for (let i = 0; i < 25; i++) {
            await handleEvent({
                body: { ...VALID_BODY, entityId: `project-${i}` },
                country: null,
                visitorId: null,
                client: null,
                db,
            });
        }
        expect(rows.length).toBeLessThan(25);
    });
});
