import { describe, expect, it } from "vitest";
import {
    computeRate,
    dayKey,
    fillDailyCounts,
    getOverview,
    getProjectDetail,
    getTopCategories,
    getTopProjects,
    getEngagement,
    getSessions,
    getTraffic,
    groupByWeek,
    parseDays,
    referrerHost,
    toShareBreakdown,
    toCategoryBreakdown,
    toCountryBreakdown,
    toLocaleBreakdown,
    toTrendPoints,
} from "./analyticsQueries";
import type { D1Like } from "./db";

function createSequencedDb(responses: unknown[]): D1Like {
    let index = 0;
    return {
        prepare() {
            return {
                bind() {
                    return {
                        async run() {},
                        async first<T>() {
                            return (responses[index++] ?? null) as T | null;
                        },
                        async all<T>() {
                            return (responses[index++] ?? { results: [] }) as { results: T[] };
                        },
                    };
                },
            };
        },
    };
}

describe("computeRate", () => {
    it("divides count by total", () => {
        expect(computeRate(67, 428)).toBeCloseTo(0.1565, 4);
    });

    it("is 0 when total is 0, not NaN or Infinity", () => {
        expect(computeRate(0, 0)).toBe(0);
    });
});

describe("fillDailyCounts", () => {
    it("returns exactly `days` points even with no rows", () => {
        expect(fillDailyCounts([], 7)).toHaveLength(7);
    });

    it("fills gaps with 0 and keeps known days", () => {
        const today = dayKey(new Date());
        const points = fillDailyCounts([{ day: today, count: 5 }], 3);
        expect(points.at(-1)).toEqual({ date: today, count: 5 });
        expect(points[0]!.count).toBe(0);
    });

    it("orders points oldest to newest", () => {
        const points = fillDailyCounts([], 5);
        const dates = points.map((point) => point.date);
        expect(dates).toEqual([...dates].sort());
    });
});

describe("toCountryBreakdown / toLocaleBreakdown", () => {
    it("converts counts to percentages of the total", () => {
        const result = toCountryBreakdown([
            { country: "PL", count: 3 },
            { country: "FI", count: 1 },
        ]);
        expect(result).toEqual([
            { country: "PL", percent: 0.75 },
            { country: "FI", percent: 0.25 },
        ]);
    });

    it("returns 0 percentages instead of NaN when the total is 0", () => {
        expect(toLocaleBreakdown([{ locale: "en", count: 0 }])).toEqual([
            { locale: "en", percent: 0 },
        ]);
    });

    it("divides by the full total, not just the top 5 shown", () => {
        const rows = [
            { country: "PL", count: 30 },
            { country: "FI", count: 20 },
            { country: "DE", count: 10 },
            { country: "US", count: 10 },
            { country: "GB", count: 10 },
            { country: "FR", count: 10 },
            { country: "UA", count: 10 },
        ];

        const result = toCountryBreakdown(rows);

        expect(result).toHaveLength(5);
        expect(result[0]).toEqual({ country: "PL", percent: 0.3 });
        expect(result[1]).toEqual({ country: "FI", percent: 0.2 });
    });

    it("returns only the top 5 by count, dropping the rest", () => {
        const rows = Array.from({ length: 8 }, (_, i) => ({
            country: `C${i}`,
            count: 8 - i,
        }));

        const result = toCountryBreakdown(rows);

        expect(result).toHaveLength(5);
        expect(result.map((row) => row.country)).toEqual(["C0", "C1", "C2", "C3", "C4"]);
    });
});

describe("toCategoryBreakdown", () => {
    it("converts counts to percentages of the total", () => {
        const result = toCategoryBreakdown([
            { category: "branding", count: 3 },
            { category: "packaging", count: 1 },
        ]);
        expect(result).toEqual([
            { category: "branding", percent: 0.75 },
            { category: "packaging", percent: 0.25 },
        ]);
    });

    it("keeps up to the top 10, unlike the top-5 country/locale breakdowns", () => {
        const rows = Array.from({ length: 12 }, (_, i) => ({
            category: `cat-${i}`,
            count: 12 - i,
        }));

        expect(toCategoryBreakdown(rows)).toHaveLength(10);
    });
});

describe("parseDays", () => {
    it("defaults to 30 for null/non-numeric input", () => {
        expect(parseDays(null)).toBe(30);
        expect(parseDays("abc")).toBe(30);
    });

    it("defaults to 30 for zero or negative input", () => {
        expect(parseDays("0")).toBe(30);
        expect(parseDays("-5")).toBe(30);
    });

    it("rejects a fractional value", () => {
        expect(parseDays("7.5")).toBe(30);
    });

    it("passes through a valid value", () => {
        expect(parseDays("90")).toBe(90);
    });

    it("clamps to 365", () => {
        expect(parseDays("10000")).toBe(365);
    });
});

describe("getOverview", () => {
    it("shapes grouped rows into a filled, triple-metric timeline", async () => {
        const today = dayKey(new Date());
        const db = createSequencedDb([
            {
                results: [
                    { eventName: "project_open", day: today, count: 3 },
                    { eventName: "contact_started", day: today, count: 2 },
                    { eventName: "contact_success", day: today, count: 1 },
                ],
            },
        ]);

        const overview = await getOverview(db, 7);

        expect(overview.projectOpens).toBe(3);
        expect(overview.contactStarts).toBe(2);
        expect(overview.contacts).toBe(1);
        expect(overview.contactConversionRate).toBeCloseTo(0.5, 5);
        expect(overview.timeline).toHaveLength(7);
        expect(overview.timeline.at(-1)).toEqual({
            date: today,
            projectOpens: 3,
            contactStarts: 2,
            contacts: 1,
        });
    });

    it("reports a 0 conversion rate instead of NaN when nobody started the form", async () => {
        const db = createSequencedDb([{ results: [] }]);
        const overview = await getOverview(db, 7);
        expect(overview.contactConversionRate).toBe(0);
    });
});

describe("getTopProjects", () => {
    it("computes CTR and gallery view rate per project, sorted by opens desc", async () => {
        const db = createSequencedDb([
            {
                results: [
                    { entityId: "esencha", opens: 100, externalClicks: 10, galleryViews: 30 },
                    { entityId: "crusty", opens: 200, externalClicks: 40, galleryViews: 20 },
                ],
            },
        ]);

        const projects = await getTopProjects(db, 30);

        expect(projects.map((p) => p.entityId)).toEqual(["crusty", "esencha"]);
        expect(projects[0]!.ctr).toBeCloseTo(0.2, 5);
        expect(projects[1]!.galleryViewRate).toBeCloseTo(0.3, 5);
    });
});

describe("getProjectDetail", () => {
    it("assembles totals, timeline and breakdowns for one project", async () => {
        const today = dayKey(new Date());
        const db = createSequencedDb([
            { opens: 50, externalClicks: 5, galleryViews: 20 },
            { results: [{ day: today, count: 4 }] },
            {
                results: [
                    { country: "PL", count: 3 },
                    { country: "FI", count: 1 },
                ],
            },
            {
                results: [
                    { locale: "en", count: 3 },
                    { locale: "pl", count: 1 },
                ],
            },
        ]);

        const detail = await getProjectDetail(db, "crusty", 7);

        expect(detail.entityId).toBe("crusty");
        expect(detail.opens).toBe(50);
        expect(detail.externalClicks).toBe(5);
        expect(detail.ctr).toBeCloseTo(0.1, 5);
        expect(detail.galleryViews).toBe(20);
        expect(detail.galleryViewRate).toBeCloseTo(0.4, 5);
        expect(detail.timeline).toHaveLength(7);
        expect(detail.timeline.at(-1)).toEqual({ date: today, count: 4 });
        expect(detail.countries).toEqual([
            { country: "PL", percent: 0.75 },
            { country: "FI", percent: 0.25 },
        ]);
        expect(detail.languages).toEqual([
            { locale: "en", percent: 0.75 },
            { locale: "pl", percent: 0.25 },
        ]);
    });

    it("defaults opens/externalClicks/galleryViews to 0 when the project has no events", async () => {
        const db = createSequencedDb([null, { results: [] }, { results: [] }, { results: [] }]);

        const detail = await getProjectDetail(db, "unknown-project", 30);

        expect(detail.opens).toBe(0);
        expect(detail.externalClicks).toBe(0);
        expect(detail.ctr).toBe(0);
        expect(detail.galleryViews).toBe(0);
        expect(detail.galleryViewRate).toBe(0);
    });
});

describe("getTopCategories", () => {
    it("converts works_filter counts into a percentage breakdown", async () => {
        const db = createSequencedDb([
            {
                results: [
                    { category: "branding", count: 6 },
                    { category: "packaging", count: 2 },
                ],
            },
        ]);

        const categories = await getTopCategories(db, 30);

        expect(categories).toEqual([
            { category: "branding", percent: 0.75 },
            { category: "packaging", percent: 0.25 },
        ]);
    });
});

describe("toShareBreakdown", () => {
    it("merges missing keys into Unknown, sorts and shares by visitors", () => {
        expect(
            toShareBreakdown(
                [
                    { key: "PL", visitors: 2 },
                    { key: null, visitors: 1 },
                    { key: "", visitors: 1 },
                    { key: "DE", visitors: 4 },
                ],
                8
            )
        ).toEqual([
            { key: "DE", visitors: 4, percent: 0.5 },
            { key: "PL", visitors: 2, percent: 0.25 },
            { key: "Unknown", visitors: 2, percent: 0.25 },
        ]);
    });

    it("keeps only the requested number of rows", () => {
        const rows = Array.from({ length: 12 }, (_, index) => ({ key: `k${index}`, visitors: 1 }));
        expect(toShareBreakdown(rows, 12)).toHaveLength(10);
    });
});

describe("referrerHost", () => {
    it("reduces a referrer to its host and folds in-site and empty referrers into Direct", () => {
        expect(referrerHost("https://www.google.com/search?q=avrash", ["dev.avrash.com"])).toBe(
            "google.com"
        );
        expect(referrerHost("https://dev.avrash.com/en/works", ["dev.avrash.com"])).toBe("Direct");
        expect(referrerHost(null, [])).toBe("Direct");
        expect(referrerHost("not a url", [])).toBe("Direct");
    });
});

describe("getTraffic", () => {
    it("builds totals, a daily timeline, page shares and visitor breakdowns", async () => {
        const today = dayKey(new Date());
        const db = createSequencedDb([
            { pageViews: 10, visitors: 4 },
            { results: [{ day: today, views: 10, visitors: 4, sessions: 5 }] },
            {
                results: [
                    { path: "/en", views: 6, visitors: 4 },
                    { path: "/en/works", views: 4, visitors: 2 },
                ],
            },
            {
                results: [
                    { key: "https://www.google.com/search", visitors: 2 },
                    { key: "https://dev.avrash.com/en", visitors: 1 },
                    { key: null, visitors: 1 },
                ],
            },
            {
                results: [
                    {
                        source: "instagram",
                        medium: "social",
                        campaign: "spring",
                        content: null,
                        sessions: 2,
                        visitors: 1,
                    },
                ],
            },
            {
                results: [
                    { key: "PL", visitors: 3 },
                    { key: "DE", visitors: 1 },
                ],
            },
            {
                results: [
                    { key: "mobile", visitors: 3 },
                    { key: "desktop", visitors: 1 },
                ],
            },
            {
                results: [
                    { key: "iOS", visitors: 3 },
                    { key: "macOS", visitors: 1 },
                ],
            },
            { results: [{ key: "Safari", visitors: 4 }] },
            { results: [{ key: "en", visitors: 4 }] },
        ]);

        const traffic = await getTraffic(db, 7, ["dev.avrash.com"]);

        expect(traffic.pageViews).toBe(10);
        expect(traffic.visitors).toBe(4);
        expect(traffic.viewsPerVisitor).toBe(2.5);
        expect(traffic.timeline).toHaveLength(7);
        expect(traffic.timeline.at(-1)).toEqual({
            date: today,
            pageViews: 10,
            visitors: 4,
            sessions: 5,
        });
        expect(traffic.campaigns).toEqual([
            {
                source: "instagram",
                medium: "social",
                campaign: "spring",
                content: null,
                sessions: 2,
                visitors: 1,
                percent: 0.25,
            },
        ]);
        expect(traffic.pages).toEqual([
            { path: "/en", views: 6, visitors: 4, percent: 0.6 },
            { path: "/en/works", views: 4, visitors: 2, percent: 0.4 },
        ]);
        expect(traffic.referrers).toEqual([
            { key: "google.com", visitors: 2, percent: 0.5 },
            { key: "Direct", visitors: 2, percent: 0.5 },
        ]);
        expect(traffic.countries[0]).toEqual({ key: "PL", visitors: 3, percent: 0.75 });
        expect(traffic.devices[0]).toEqual({ key: "mobile", visitors: 3, percent: 0.75 });
        expect(traffic.operatingSystems[0]!.key).toBe("iOS");
        expect(traffic.browsers).toEqual([{ key: "Safari", visitors: 4, percent: 1 }]);
        expect(traffic.languages).toEqual([{ key: "en", visitors: 4, percent: 1 }]);
    });

    it("returns zeros instead of NaN for a period without page views", async () => {
        const traffic = await getTraffic(createSequencedDb([{ pageViews: 0, visitors: 0 }]), 7);
        expect(traffic.pageViews).toBe(0);
        expect(traffic.viewsPerVisitor).toBe(0);
        expect(traffic.pages).toEqual([]);
        expect(traffic.countries).toEqual([]);
        expect(traffic.campaigns).toEqual([]);
    });
});

describe("getEngagement", () => {
    it("counts CV downloads, shares social clicks by network and charts both", async () => {
        const today = dayKey(new Date());
        const db = createSequencedDb([
            { count: 5 },
            {
                results: [
                    { entityId: "instagram", count: 1 },
                    { entityId: "behance", count: 3 },
                ],
            },
            {
                results: [
                    { eventName: "cv_download", day: today, count: 5 },
                    { eventName: "social_click", day: today, count: 4 },
                ],
            },
        ]);

        const engagement = await getEngagement(db, 30);

        expect(engagement).toMatchObject({
            cvDownloads: 5,
            socialClicks: 4,
            socials: [
                { entityId: "behance", count: 3, percent: 0.75 },
                { entityId: "instagram", count: 1, percent: 0.25 },
            ],
        });
        expect(engagement.timeline).toHaveLength(30);
        expect(engagement.timeline.at(-1)).toEqual({
            date: today,
            cvDownloads: 5,
            socialClicks: 4,
        });
    });

    it("switches the trend to weekly points for periods longer than a month", async () => {
        const engagement = await getEngagement(createSequencedDb([{ count: 0 }]), 90);
        expect(engagement.timeline).toHaveLength(13);
        expect(engagement.timeline.every((point) => point.cvDownloads === 0)).toBe(true);
    });
});

describe("groupByWeek / toTrendPoints", () => {
    it("sums seven-day chunks ending today and dates each by its first day", () => {
        const points = Array.from({ length: 10 }, (_, index) => ({
            date: `2026-09-${String(index + 1).padStart(2, "0")}`,
            count: index + 1,
        }));
        expect(groupByWeek(points)).toEqual([
            { date: "2026-09-01", count: 6 },
            { date: "2026-09-04", count: 49 },
        ]);
    });

    it("keeps daily points up to a 30-day period", () => {
        expect(toTrendPoints([], 30)).toHaveLength(30);
        expect(toTrendPoints([], 31)).toHaveLength(5);
    });
});

describe("getSessions", () => {
    it("derives per-session averages, the median duration and both funnels", async () => {
        const db = createSequencedDb([
            {
                sessions: 10,
                pageViews: 25,
                events: 40,
                bounces: 4,
                opened: 6,
                viewedGallery: 3,
                clickedThrough: 2,
                startedContact: 2,
                sentContact: 1,
            },
            { medianMs: 45_000 },
        ]);

        const summary = await getSessions(db, 30);

        expect(summary).toMatchObject({
            sessions: 10,
            pagesPerSession: 2.5,
            eventsPerSession: 4,
            bounceRate: 0.4,
            medianDurationMs: 45_000,
        });
        expect(summary.projectFunnel).toEqual([
            { key: "sessions", sessions: 10, ofSessions: 1, ofBase: 1 },
            { key: "project_open", sessions: 6, ofSessions: 0.6, ofBase: 0.6 },
            { key: "project_gallery_view", sessions: 3, ofSessions: 0.3, ofBase: 0.5 },
            { key: "project_external_click", sessions: 2, ofSessions: 0.2, ofBase: 2 / 6 },
        ]);
        expect(summary.contactFunnel).toEqual([
            { key: "sessions", sessions: 10, ofSessions: 1, ofBase: 1 },
            { key: "contact_started", sessions: 2, ofSessions: 0.2, ofBase: 0.2 },
            { key: "contact_success", sessions: 1, ofSessions: 0.1, ofBase: 0.5 },
        ]);
    });

    it("reports zeros and no median for a period without sessions", async () => {
        const summary = await getSessions(createSequencedDb([{ sessions: 0 }]), 7);
        expect(summary).toMatchObject({
            sessions: 0,
            pagesPerSession: 0,
            bounceRate: 0,
            medianDurationMs: null,
        });
        expect(summary.contactFunnel.every((step) => step.ofBase === 0)).toBe(true);
    });
});
