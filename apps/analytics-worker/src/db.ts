import type { AnalyticsEventBody } from "./schema";

export interface AnalyticsEventRow {
    id: string;
    eventName: string;
    entityId: string | null;
    path: string;
    locale: string;
    sessionId: string;
    country: string | null;
    referrer: string | null;
    createdAt: number;
}

// The slice of the D1Database client this module actually calls - narrowed
// so db.ts/handleEvent.ts can be unit tested with a plain mock object
// instead of a real D1 binding (which only exists inside a deployed Worker).
export interface D1Like {
    prepare(query: string): {
        bind(...values: unknown[]): {
            run(): Promise<unknown>;
            first<T>(): Promise<T | null>;
            all<T>(): Promise<{ results: T[] }>;
        };
    };
}

export function buildEventRow(body: AnalyticsEventBody, country: string | null): AnalyticsEventRow {
    return {
        id: crypto.randomUUID(),
        eventName: body.eventName,
        entityId: body.entityId ?? null,
        path: body.path,
        locale: body.locale,
        sessionId: body.sessionId,
        country,
        referrer: body.referrer ?? null,
        createdAt: Date.now(),
    };
}

const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

// Server-side backstop for the same "re-opening a project doesn't count as
// another view" rule the client already applies via sessionStorage - a
// visitor with storage disabled, or a replayed beacon, shouldn't be able to
// inflate a project's view count either.
export async function wasRecentlyTracked(
    db: D1Like,
    row: { sessionId: string; eventName: string; entityId?: string | null }
): Promise<boolean> {
    if (!row.entityId) return false;

    const since = Date.now() - DEDUPE_WINDOW_MS;
    const existing = await db
        .prepare(
            `SELECT id FROM analytics_events
             WHERE session_id = ? AND event_name = ? AND entity_id = ? AND created_at > ?
             LIMIT 1`
        )
        .bind(row.sessionId, row.eventName, row.entityId, since)
        .first();

    return existing !== null;
}

const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX_EVENTS = 20;

// A real visitor doesn't fire more than a handful of these events a minute -
// this catches a misbehaving script or a deliberate flood, not normal use.
export async function isSessionRateLimited(db: D1Like, sessionId: string): Promise<boolean> {
    const since = Date.now() - RATE_LIMIT_WINDOW_MS;
    const result = await db
        .prepare(
            "SELECT COUNT(*) as count FROM analytics_events WHERE session_id = ? AND created_at > ?"
        )
        .bind(sessionId, since)
        .first<{ count: number }>();

    return (result?.count ?? 0) >= RATE_LIMIT_MAX_EVENTS;
}

export async function insertEvent(db: D1Like, row: AnalyticsEventRow): Promise<void> {
    await db
        .prepare(
            `INSERT INTO analytics_events
                (id, event_name, entity_id, path, locale, session_id, country, referrer, created_at)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
            row.id,
            row.eventName,
            row.entityId,
            row.path,
            row.locale,
            row.sessionId,
            row.country,
            row.referrer,
            row.createdAt
        )
        .run();
}
