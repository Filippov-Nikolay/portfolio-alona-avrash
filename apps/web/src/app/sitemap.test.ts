import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import robots from "./robots";
import sitemap from "./sitemap";

const projects = vi.hoisted(() => ({ list: [] as { name: string; createdAt: string }[] }));

vi.mock("@/entities/project/lib/resolveProjects", () => ({
    getAllProjects: async () => projects.list,
}));
vi.mock("@/shared/config/site.config", () => ({
    siteConfig: { url: "https://avrash.com" },
}));

beforeEach(() => {
    projects.list = [
        { name: "ESENCHA", createdAt: "2025-03-14T00:00:00.000Z" },
        { name: "Crusty Bakery", createdAt: "not a date" },
    ];
});

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("sitemap", () => {
    it("lists every project page in every language", async () => {
        const urls = (await sitemap()).map((entry) => entry.url);
        expect(urls).toEqual(
            expect.arrayContaining([
                "https://avrash.com/en/works/esencha",
                "https://avrash.com/pl/works/esencha",
                "https://avrash.com/en/works/crusty-bakery",
                "https://avrash.com/pl/works/crusty-bakery",
            ])
        );
        expect(urls).toHaveLength(8 * 2 + 2 * 2);
    });

    it("links each page to its translations and an x-default", async () => {
        const entry = (await sitemap()).find(
            (item) => item.url === "https://avrash.com/pl/works/esencha"
        );
        expect(entry?.alternates?.languages).toEqual({
            en: "https://avrash.com/en/works/esencha",
            pl: "https://avrash.com/pl/works/esencha",
            "x-default": "https://avrash.com/en/works/esencha",
        });
    });

    it("dates project pages by the project and leaves undated pages without lastModified", async () => {
        const entries = await sitemap();
        const byUrl = new Map(entries.map((entry) => [entry.url, entry]));
        expect(byUrl.get("https://avrash.com/en/works/esencha")?.lastModified).toEqual(
            new Date("2025-03-14T00:00:00.000Z")
        );
        expect(byUrl.get("https://avrash.com/en/works/crusty-bakery")).not.toHaveProperty(
            "lastModified"
        );
        expect(byUrl.get("https://avrash.com/en")).not.toHaveProperty("lastModified");
    });
});

describe("robots", () => {
    it("allows crawling and points to the sitemap in production", () => {
        vi.stubEnv("VERCEL_ENV", "production");
        expect(robots()).toEqual({
            rules: { userAgent: "*", allow: "/" },
            sitemap: "https://avrash.com/sitemap.xml",
        });
    });

    it("disallows everything on preview deployments", () => {
        vi.stubEnv("VERCEL_ENV", "preview");
        expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
    });
});
