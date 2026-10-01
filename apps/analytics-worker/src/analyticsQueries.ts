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

export function groupByWeek(points: TimelinePoint[]): TimelinePoint[] {
    const weeks: TimelinePoint[] = [];
    for (let end = points.length; end > 0; end -= 7) {
        const chunk = points.slice(Math.max(0, end - 7), end);
        weeks.unshift({
            date: chunk[0]!.date,
            count: chunk.reduce((sum, point) => sum + point.count, 0),
        });
    }
    return weeks;
}

const WEEKLY_THRESHOLD_DAYS = 30;

export function toTrendPoints(
    rows: { day: string; count: number }[],
    days: number
): TimelinePoint[] {
    const daily = fillDailyCounts(rows, days);
    return days > WEEKLY_THRESHOLD_DAYS ? groupByWeek(daily) : daily;
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

export interface TrafficTimelinePoint {
    date: string;
    pageViews: number;
    visitors: number;
    sessions: number;
}

export interface PageStat {
    path: string;
    views: number;
    visitors: number;
    percent: number;
}

export interface ShareBreakdown {
    key: string;
    visitors: number;
    percent: number;
}

export interface CampaignStat {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    content: string | null;
    sessions: number;
    visitors: number;
    percent: number;
}

export interface TrafficOverview {
    pageViews: number;
    visitors: number;
    viewsPerVisitor: number;
    timeline: TrafficTimelinePoint[];
    pages: PageStat[];
    countries: ShareBreakdown[];
    devices: ShareBreakdown[];
    operatingSystems: ShareBreakdown[];
    browsers: ShareBreakdown[];
    languages: ShareBreakdown[];
    referrers: ShareBreakdown[];
    campaigns: CampaignStat[];
}

const TOP_PAGES_LIMIT = 50;
const TOP_CAMPAIGNS_LIMIT = 20;
const TOP_SHARE_LIMIT = 10;

export function toShareBreakdown(
    rows: { key: string | null; visitors: number }[],
    totalVisitors: number,
    limit = TOP_SHARE_LIMIT
): ShareBreakdown[] {
    const merged = new Map<string, number>();
    for (const row of rows) {
        const key = row.key || "Unknown";
        merged.set(key, (merged.get(key) ?? 0) + row.visitors);
    }
    return [...merged]
        .map(([key, visitors]) => ({
            key,
            visitors,
            percent: computeRate(visitors, totalVisitors),
        }))
        .sort((a, b) => b.visitors - a.visitors)
        .slice(0, limit);
}

export function referrerHost(referrer: string | null, ownHosts: readonly string[]): string {
    if (!referrer) return "Direct";
    try {
        const host = new URL(referrer).hostname.replace(/^www\./, "");
        return ownHosts.includes(host) ? "Direct" : host;
    } catch {
        return "Direct";
    }
}

const VISITOR_KEY = "COALESCE(visitor_id, session_id)";

export async function getTraffic(
    db: D1Like,
    days: number,
    ownHosts: readonly string[] = []
): Promise<TrafficOverview> {
    const since = daysAgo(days);
    const scope = `FROM analytics_events WHERE event_name = 'page_view' AND created_at > ?`;

    const totals = await db
        .prepare(
            `SELECT COUNT(*) as pageViews, COUNT(DISTINCT ${VISITOR_KEY}) as visitors ${scope}`
        )
        .bind(since)
        .first<{ pageViews: number | null; visitors: number | null }>();
    const pageViews = totals?.pageViews ?? 0;
    const visitors = totals?.visitors ?? 0;

    const dailyRows = await db
        .prepare(
            `SELECT date(created_at / 1000, 'unixepoch') as day, COUNT(*) as views,
                    COUNT(DISTINCT ${VISITOR_KEY}) as visitors,
                    COUNT(DISTINCT session_id) as sessions
             ${scope}
             GROUP BY day`
        )
        .bind(since)
        .all<{ day: string; views: number; visitors: number; sessions: number }>();
    const views = fillDailyCounts(
        dailyRows.results.map((row) => ({ day: row.day, count: row.views })),
        days
    );
    const dailyVisitors = fillDailyCounts(
        dailyRows.results.map((row) => ({ day: row.day, count: row.visitors })),
        days
    );
    const dailySessions = fillDailyCounts(
        dailyRows.results.map((row) => ({ day: row.day, count: row.sessions })),
        days
    );

    const pageRows = await db
        .prepare(
            `SELECT path, COUNT(*) as views, COUNT(DISTINCT ${VISITOR_KEY}) as visitors
             ${scope}
             GROUP BY path
             ORDER BY views DESC
             LIMIT ?`
        )
        .bind(since, TOP_PAGES_LIMIT)
        .all<{ path: string; views: number; visitors: number }>();

    const breakdown = async (column: string) =>
        (
            await db
                .prepare(
                    `SELECT ${column} as key, COUNT(DISTINCT ${VISITOR_KEY}) as visitors
                     ${scope}
                     GROUP BY ${column}`
                )
                .bind(since)
                .all<{ key: string | null; visitors: number }>()
        ).results;

    const referrerRows = await breakdown("referrer");

    const campaignRows = await db
        .prepare(
            `SELECT utm_source as source, utm_medium as medium, utm_campaign as campaign,
                    utm_content as content, COUNT(DISTINCT session_id) as sessions,
                    COUNT(DISTINCT ${VISITOR_KEY}) as visitors
             ${scope}
               AND (utm_source IS NOT NULL OR utm_medium IS NOT NULL
                    OR utm_campaign IS NOT NULL OR utm_content IS NOT NULL)
             GROUP BY utm_source, utm_medium, utm_campaign, utm_content
             ORDER BY visitors DESC, sessions DESC
             LIMIT ?`
        )
        .bind(since, TOP_CAMPAIGNS_LIMIT)
        .all<Omit<CampaignStat, "percent">>();

    return {
        pageViews,
        visitors,
        viewsPerVisitor: computeRate(pageViews, visitors),
        timeline: views.map((point, index) => ({
            date: point.date,
            pageViews: point.count,
            visitors: dailyVisitors[index]!.count,
            sessions: dailySessions[index]!.count,
        })),
        pages: pageRows.results.map((row) => ({
            ...row,
            percent: computeRate(row.views, pageViews),
        })),
        countries: toShareBreakdown(await breakdown("country"), visitors),
        devices: toShareBreakdown(await breakdown("device"), visitors),
        operatingSystems: toShareBreakdown(await breakdown("os"), visitors),
        browsers: toShareBreakdown(await breakdown("browser"), visitors),
        languages: toShareBreakdown(await breakdown("locale"), visitors),
        referrers: toShareBreakdown(
            referrerRows.map((row) => ({
                key: referrerHost(row.key, ownHosts),
                visitors: row.visitors,
            })),
            visitors
        ),
        campaigns: campaignRows.results.map((row) => ({
            ...row,
            percent: computeRate(row.visitors, visitors),
        })),
    };
}

export interface EntityCount {
    entityId: string;
    count: number;
    percent: number;
}

export interface EngagementTimelinePoint {
    date: string;
    cvDownloads: number;
    socialClicks: number;
}

export interface EngagementSummary {
    cvDownloads: number;
    cvLanguages: EntityCount[];
    socialClicks: number;
    socials: EntityCount[];
    timeline: EngagementTimelinePoint[];
}

export async function getEngagement(db: D1Like, days: number): Promise<EngagementSummary> {
    const since = daysAgo(days);
    const cv = await db
        .prepare(
            `SELECT entity_id as entityId, COUNT(*) as count FROM analytics_events
             WHERE event_name = 'cv_download' AND created_at > ?
             GROUP BY entity_id`
        )
        .bind(since)
        .all<{ entityId: string | null; count: number }>();
    const { results } = await db
        .prepare(
            `SELECT entity_id as entityId, COUNT(*) as count FROM analytics_events
             WHERE event_name = 'social_click' AND entity_id IS NOT NULL AND created_at > ?
             GROUP BY entity_id`
        )
        .bind(since)
        .all<{ entityId: string; count: number }>();
    const trendRows = await db
        .prepare(
            `SELECT event_name as eventName, date(created_at / 1000, 'unixepoch') as day,
                    COUNT(*) as count
             FROM analytics_events
             WHERE (event_name = 'cv_download'
                    OR (event_name = 'social_click' AND entity_id IS NOT NULL))
               AND created_at > ?
             GROUP BY event_name, day`
        )
        .bind(since)
        .all<{ eventName: string; day: string; count: number }>();
    const cvTrend = toTrendPoints(
        trendRows.results.filter((row) => row.eventName === "cv_download"),
        days
    );
    const socialTrend = toTrendPoints(
        trendRows.results.filter((row) => row.eventName === "social_click"),
        days
    );

    const socialClicks = results.reduce((sum, row) => sum + row.count, 0);
    const cvDownloads = cv.results.reduce((sum, row) => sum + row.count, 0);
    return {
        cvDownloads,
        cvLanguages: cv.results
            .filter((row): row is { entityId: string; count: number } => row.entityId !== null)
            .map((row) => ({
                entityId: row.entityId,
                count: row.count,
                percent: computeRate(row.count, cvDownloads),
            }))
            .sort((a, b) => b.count - a.count),
        socialClicks,
        socials: results
            .map((row) => ({ ...row, percent: computeRate(row.count, socialClicks) }))
            .sort((a, b) => b.count - a.count),
        timeline: cvTrend.map((point, index) => ({
            date: point.date,
            cvDownloads: point.count,
            socialClicks: socialTrend[index]!.count,
        })),
    };
}

export interface FunnelStep {
    key: string;
    sessions: number;
    ofSessions: number;
    ofBase: number;
}

export interface SessionsSummary {
    sessions: number;
    pagesPerSession: number;
    eventsPerSession: number;
    bounceRate: number;
    medianDurationMs: number | null;
    projectFunnel: FunnelStep[];
    contactFunnel: FunnelStep[];
}

const SESSIONS_CTE = `WITH sessions AS (
    SELECT session_id,
           MIN(created_at) AS started_at,
           MAX(created_at) AS ended_at,
           SUM(event_name = 'page_view') AS page_views,
           COUNT(*) AS events,
           MAX(event_name = 'project_open') AS opened,
           MAX(event_name = 'project_gallery_view') AS viewed_gallery,
           MAX(event_name = 'project_external_click') AS clicked_through,
           MAX(event_name = 'contact_started') AS started_contact,
           MAX(event_name = 'contact_success') AS sent_contact
    FROM analytics_events
    WHERE created_at > ?
    GROUP BY session_id
    HAVING page_views > 0
)`;

function funnelStep(key: string, sessions: number, total: number, base: number): FunnelStep {
    return {
        key,
        sessions,
        ofSessions: computeRate(sessions, total),
        ofBase: computeRate(sessions, base),
    };
}

export async function getSessions(db: D1Like, days: number): Promise<SessionsSummary> {
    const since = daysAgo(days);

    const totals = await db
        .prepare(
            `${SESSIONS_CTE}
             SELECT COUNT(*) as sessions,
                    SUM(page_views) as pageViews,
                    SUM(events) as events,
                    SUM(page_views = 1) as bounces,
                    SUM(opened) as opened,
                    SUM(opened AND viewed_gallery) as viewedGallery,
                    SUM(opened AND clicked_through) as clickedThrough,
                    SUM(started_contact) as startedContact,
                    SUM(started_contact AND sent_contact) as sentContact
             FROM sessions`
        )
        .bind(since)
        .first<{
            sessions: number | null;
            pageViews: number | null;
            events: number | null;
            bounces: number | null;
            opened: number | null;
            viewedGallery: number | null;
            clickedThrough: number | null;
            startedContact: number | null;
            sentContact: number | null;
        }>();

    const median = await db
        .prepare(
            `${SESSIONS_CTE},
             durations AS (
                 SELECT ended_at - started_at AS duration FROM sessions WHERE page_views > 1
             )
             SELECT AVG(duration) as medianMs FROM (
                 SELECT duration FROM durations
                 ORDER BY duration
                 LIMIT 2 - (SELECT COUNT(*) FROM durations) % 2
                 OFFSET ((SELECT COUNT(*) FROM durations) - 1) / 2
             )`
        )
        .bind(since)
        .first<{ medianMs: number | null }>();

    const sessions = totals?.sessions ?? 0;
    const opened = totals?.opened ?? 0;
    const startedContact = totals?.startedContact ?? 0;

    return {
        sessions,
        pagesPerSession: computeRate(totals?.pageViews ?? 0, sessions),
        eventsPerSession: computeRate(totals?.events ?? 0, sessions),
        bounceRate: computeRate(totals?.bounces ?? 0, sessions),
        medianDurationMs: median?.medianMs ?? null,
        projectFunnel: [
            funnelStep("sessions", sessions, sessions, sessions),
            funnelStep("project_open", opened, sessions, sessions),
            funnelStep("project_gallery_view", totals?.viewedGallery ?? 0, sessions, opened),
            funnelStep("project_external_click", totals?.clickedThrough ?? 0, sessions, opened),
        ],
        contactFunnel: [
            funnelStep("sessions", sessions, sessions, sessions),
            funnelStep("contact_started", startedContact, sessions, sessions),
            funnelStep("contact_success", totals?.sentContact ?? 0, sessions, startedContact),
        ],
    };
}
