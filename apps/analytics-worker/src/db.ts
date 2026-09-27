import type { AnalyticsEventBody } from "./schema";
import type { ClientInfo } from "./userAgent";

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
    visitorId: string | null;
    device: string | null;
    os: string | null;
    browser: string | null;
    utmSource: string | null;
    utmMedium: string | null;
    utmCampaign: string | null;
    utmContent: string | null;
}

export interface EventClientContext {
    country: string | null;
    visitorId: string | null;
    client: ClientInfo | null;
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

export function referrerOrigin(referrer: string | undefined): string | null {
    if (!referrer) return null;
    try {
        const url = new URL(referrer);
        return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
    } catch {
        return null;
    }
}

export function buildEventRow(
    body: AnalyticsEventBody,
    { country, visitorId, client }: EventClientContext
): AnalyticsEventRow {
    return {
        id: crypto.randomUUID(),
        eventName: body.eventName,
        entityId: body.entityId ?? null,
        path: body.path,
        locale: body.locale,
        sessionId: body.sessionId,
        country,
        referrer: referrerOrigin(body.referrer),
        createdAt: Date.now(),
        visitorId,
        device: client?.device ?? null,
        os: client?.os ?? null,
        browser: client?.browser ?? null,
        utmSource: body.utm?.source ?? null,
        utmMedium: body.utm?.medium ?? null,
        utmCampaign: body.utm?.campaign ?? null,
        utmContent: body.utm?.content ?? null,
    };
}

const DEDUPE_WINDOW_MS = 30 * 60 * 1000;
const DEDUPED_EVENTS = new Set(["project_open", "project_gallery_view", "works_filter"]);

// Server-side backstop for the same "re-opening a project doesn't count as
// another view" rule the client already applies via sessionStorage - a
// visitor with storage disabled, or a replayed beacon, shouldn't be able to
// inflate a project's view count either.
export async function wasRecentlyTracked(
    db: D1Like,
    row: { sessionId: string; eventName: string; entityId?: string | null }
): Promise<boolean> {
    if (!row.entityId || !DEDUPED_EVENTS.has(row.eventName)) return false;

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
                (id, event_name, entity_id, path, locale, session_id, country, referrer, created_at,
                 visitor_id, device, os, browser, utm_source, utm_medium, utm_campaign, utm_content)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
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
            row.createdAt,
            row.visitorId,
            row.device,
            row.os,
            row.browser,
            row.utmSource,
            row.utmMedium,
            row.utmCampaign,
            row.utmContent
        )
        .run();
}

export async function deleteEventsBefore(db: D1Like, cutoff: number): Promise<void> {
    await db.prepare("DELETE FROM analytics_events WHERE created_at < ?").bind(cutoff).run();
}
