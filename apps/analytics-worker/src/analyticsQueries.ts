import type { D1Like } from "./db";

export interface TimelinePoint {
    date: string;
    count: number;
}

export interface OverviewTimelinePoint {
    date: string;
    projectOpens: number;
    contactStarts: number;
    contacts: number;
}

export interface AnalyticsOverview {
    projectOpens: number;
    contactStarts: number;
    contacts: number;
    // contacts / contactStarts - how many visitors who started the contact
    // form actually sent it, not just opens/clicks on the button around it.
    contactConversionRate: number;
    timeline: OverviewTimelinePoint[];
}

export interface ProjectSummary {
    entityId: string;
    opens: number;
    externalClicks: number;
    ctr: number;
    galleryViews: number;
    // galleryViews / opens - how many visitors who opened this project went
    // on to look at its gallery, a deeper-engagement signal than open alone.
    galleryViewRate: number;
}

export interface CountryBreakdown {
    country: string;
    percent: number;
}

export interface LocaleBreakdown {
    locale: string;
    percent: number;
}

export interface CategoryBreakdown {
    category: string;
    percent: number;
}

export interface ProjectDetail extends ProjectSummary {
    timeline: TimelinePoint[];
    countries: CountryBreakdown[];
    languages: LocaleBreakdown[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

// Shared by every ratio this module reports (external-click CTR, gallery-
// view rate, contact conversion rate) - all the same shape: how many of a
// larger group went on to do a smaller, more specific thing.
export function computeRate(count: number, total: number): number {
    return total > 0 ? count / total : 0;
}

export function dayKey(date: Date): string {
    return date.toISOString().slice(0, 10);
}

// D1 only returns rows for days that actually had events - this fills the
// gaps with zeros so the chart gets one point per day in range, not a
// timeline that silently skips quiet days.
export function fillDailyCounts(
    rows: { day: string; count: number }[],
    days: number
): TimelinePoint[] {
    const byDay = new Map(rows.map((row) => [row.day, row.count]));
    const points: TimelinePoint[] = [];
    for (let i = days - 1; i >= 0; i--) {
        const date = dayKey(new Date(Date.now() - i * DAY_MS));
        points.push({ date, count: byDay.get(date) ?? 0 });
    }
    return points;
}

const TOP_BREAKDOWN_LIMIT = 5;

export function toCountryBreakdown(rows: { country: string; count: number }[]): CountryBreakdown[] {
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return [...rows]
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_BREAKDOWN_LIMIT)
        .map((row) => ({ country: row.country, percent: total > 0 ? row.count / total : 0 }));
}

export function toLocaleBreakdown(rows: { locale: string; count: number }[]): LocaleBreakdown[] {
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return [...rows]
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_BREAKDOWN_LIMIT)
        .map((row) => ({ locale: row.locale, percent: total > 0 ? row.count / total : 0 }));
}

const TOP_CATEGORY_LIMIT = 10;

export function toCategoryBreakdown(
    rows: { category: string; count: number }[]
): CategoryBreakdown[] {
    const total = rows.reduce((sum, row) => sum + row.count, 0);
    return [...rows]
        .sort((a, b) => b.count - a.count)
        .slice(0, TOP_CATEGORY_LIMIT)
        .map((row) => ({ category: row.category, percent: total > 0 ? row.count / total : 0 }));
}

// Clamped so a malformed/absent ?days= query param can't turn into an
// unbounded table scan.
export function parseDays(raw: string | null): number {
    const value = Number(raw);
    if (!Number.isInteger(value) || value < 1) return 30;
    return Math.min(value, 365);
}

function daysAgo(days: number): number {
    return Date.now() - days * DAY_MS;
}

export async function getOverview(db: D1Like, days: number): Promise<AnalyticsOverview> {
    const since = daysAgo(days);
    const { results } = await db
        .prepare(
            `SELECT event_name as eventName, date(created_at / 1000, 'unixepoch') as day, COUNT(*) as count
             FROM analytics_events
             WHERE event_name IN ('project_open', 'contact_started', 'contact_success') AND created_at > ?
             GROUP BY event_name, day`
        )
        .bind(since)
        .all<{ eventName: string; day: string; count: number }>();

    const opensRows = results.filter((row) => row.eventName === "project_open");
    const contactStartsRows = results.filter((row) => row.eventName === "contact_started");
    const contactsRows = results.filter((row) => row.eventName === "contact_success");
    const opens = fillDailyCounts(opensRows, days);
    const contactStarts = fillDailyCounts(contactStartsRows, days);
    const contacts = fillDailyCounts(contactsRows, days);

    const totalProjectOpens = opens.reduce((sum, point) => sum + point.count, 0);
    const totalContactStarts = contactStarts.reduce((sum, point) => sum + point.count, 0);
    const totalContacts = contacts.reduce((sum, point) => sum + point.count, 0);

    return {
        projectOpens: totalProjectOpens,
        contactStarts: totalContactStarts,
        contacts: totalContacts,
        contactConversionRate: computeRate(totalContacts, totalContactStarts),
        timeline: opens.map((point, i) => ({
            date: point.date,
            projectOpens: point.count,
            contactStarts: contactStarts[i]!.count,
            contacts: contacts[i]!.count,
        })),
    };
}

export async function getTopProjects(
    db: D1Like,
    days: number,
    limit = 20
): Promise<ProjectSummary[]> {
    const since = daysAgo(days);
    const { results } = await db
        .prepare(
            `SELECT entity_id as entityId,
                    SUM(CASE WHEN event_name = 'project_open' THEN 1 ELSE 0 END) as opens,
                    SUM(CASE WHEN event_name = 'project_external_click' THEN 1 ELSE 0 END) as externalClicks,
                    SUM(CASE WHEN event_name = 'project_gallery_view' THEN 1 ELSE 0 END) as galleryViews
             FROM analytics_events
             WHERE entity_id IS NOT NULL
               AND event_name IN ('project_open', 'project_external_click', 'project_gallery_view')
               AND created_at > ?
             GROUP BY entity_id
             ORDER BY opens DESC
             LIMIT ?`
        )
        .bind(since, limit)
        .all<{ entityId: string; opens: number; externalClicks: number; galleryViews: number }>();

    return results
        .map((row) => ({
            ...row,
            ctr: computeRate(row.externalClicks, row.opens),
            galleryViewRate: computeRate(row.galleryViews, row.opens),
        }))
        .sort((a, b) => b.opens - a.opens);
}

export async function getProjectDetail(
    db: D1Like,
    entityId: string,
    days: number
): Promise<ProjectDetail> {
    const since = daysAgo(days);

    const totals = await db
        .prepare(
            `SELECT
                SUM(CASE WHEN event_name = 'project_open' THEN 1 ELSE 0 END) as opens,
                SUM(CASE WHEN event_name = 'project_external_click' THEN 1 ELSE 0 END) as externalClicks,
                SUM(CASE WHEN event_name = 'project_gallery_view' THEN 1 ELSE 0 END) as galleryViews
             FROM analytics_events
             WHERE entity_id = ?
               AND event_name IN ('project_open', 'project_external_click', 'project_gallery_view')
               AND created_at > ?`
        )
        .bind(entityId, since)
        .first<{
            opens: number | null;
            externalClicks: number | null;
            galleryViews: number | null;
        }>();

    const opens = totals?.opens ?? 0;
    const externalClicks = totals?.externalClicks ?? 0;
    const galleryViews = totals?.galleryViews ?? 0;

    const timelineRows = await db
        .prepare(
            `SELECT date(created_at / 1000, 'unixepoch') as day, COUNT(*) as count
             FROM analytics_events
             WHERE entity_id = ? AND event_name = 'project_open' AND created_at > ?
             GROUP BY day`
        )
        .bind(entityId, since)
        .all<{ day: string; count: number }>();

    // No LIMIT here - toCountryBreakdown/toLocaleBreakdown need every row to
    // compute an accurate percentage denominator, and do their own top-5
    // truncation for display after that.
    const countryRows = await db
        .prepare(
            `SELECT country, COUNT(*) as count
             FROM analytics_events
             WHERE entity_id = ? AND event_name = 'project_open' AND created_at > ? AND country IS NOT NULL
             GROUP BY country`
        )
        .bind(entityId, since)
        .all<{ country: string; count: number }>();

    const localeRows = await db
        .prepare(
            `SELECT locale, COUNT(*) as count
             FROM analytics_events
             WHERE entity_id = ? AND event_name = 'project_open' AND created_at > ?
             GROUP BY locale`
        )
        .bind(entityId, since)
        .all<{ locale: string; count: number }>();

    return {
        entityId,
        opens,
        externalClicks,
        ctr: computeRate(externalClicks, opens),
        galleryViews,
        galleryViewRate: computeRate(galleryViews, opens),
        timeline: fillDailyCounts(timelineRows.results, days),
        countries: toCountryBreakdown(countryRows.results),
        languages: toLocaleBreakdown(localeRows.results),
    };
}

export async function getTopCategories(db: D1Like, days: number): Promise<CategoryBreakdown[]> {
    const since = daysAgo(days);
    const { results } = await db
        .prepare(
            `SELECT entity_id as category, COUNT(*) as count
             FROM analytics_events
             WHERE event_name = 'works_filter' AND entity_id IS NOT NULL AND created_at > ?
             GROUP BY entity_id`
        )
        .bind(since)
        .all<{ category: string; count: number }>();

    return toCategoryBreakdown(results);
}
