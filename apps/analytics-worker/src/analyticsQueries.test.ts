import { describe, expect, it } from "vitest";
import {
    computeRate,
    dayKey,
    fillDailyCounts,
    getOverview,
    getProjectDetail,
    getTopCategories,
    getTopProjects,
    parseDays,
    toCategoryBreakdown,
    toCountryBreakdown,
    toLocaleBreakdown,
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
