import { afterEach, describe, expect, it, vi } from "vitest";
import { formatCategoryList, isIndexable, robotsDirectives } from "./seo";

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("isIndexable", () => {
    it("indexes the Vercel production deployment", () => {
        vi.stubEnv("VERCEL_ENV", "production");
        expect(isIndexable()).toBe(true);
        expect(robotsDirectives()).toEqual({ index: true, follow: true });
    });

    it.each(["preview", "development"])("keeps a Vercel %s deployment out of search", (env) => {
        vi.stubEnv("VERCEL_ENV", env);
        expect(isIndexable()).toBe(false);
        expect(robotsDirectives()).toEqual({ index: false, follow: false });
    });

    it("indexes a self-hosted build, where VERCEL_ENV is not set", () => {
        vi.stubEnv("VERCEL_ENV", undefined);
        expect(isIndexable()).toBe(true);
    });
});

describe("formatCategoryList", () => {
    it("joins categories as a sentence in the page language", () => {
        expect(formatCategoryList(["Branding", "Logo Design", "Packaging"], "en")).toBe(
            "branding, logo design, and packaging"
        );
        expect(formatCategoryList(["Branding", "Projektowanie logo", "Opakowania"], "pl")).toBe(
            "branding, projektowanie logo i opakowania"
        );
    });

    it("keeps abbreviations in capitals", () => {
        expect(formatCategoryList(["UI/UX", "Web Design"], "en")).toBe("UI/UX and web design");
    });
});
