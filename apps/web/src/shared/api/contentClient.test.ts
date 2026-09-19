import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveCdnAssetUrls } from "./contentClient";

describe("resolveCdnAssetUrls", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
    });

    it("returns the value unchanged when CONTENT_CDN_URL is not set", () => {
        vi.stubEnv("CONTENT_CDN_URL", "");
        const value = { src: "/projects/esencha/001.gif" };
        expect(resolveCdnAssetUrls(value)).toEqual(value);
    });

    describe("with CONTENT_CDN_URL set", () => {
        beforeEach(() => {
            vi.stubEnv("CONTENT_CDN_URL", "https://cdn-dev.avrash.com");
        });

        it("rewrites a top-level /projects/ path to an absolute CDN URL", () => {
            expect(resolveCdnAssetUrls("/projects/esencha/001.gif")).toBe(
                "https://cdn-dev.avrash.com/projects/esencha/001.gif"
            );
        });

        it("strips a trailing slash on CONTENT_CDN_URL before concatenating", () => {
            vi.stubEnv("CONTENT_CDN_URL", "https://cdn-dev.avrash.com/");
            expect(resolveCdnAssetUrls("/projects/esencha/001.gif")).toBe(
                "https://cdn-dev.avrash.com/projects/esencha/001.gif"
            );
        });

        it("leaves a path outside /projects/ untouched, e.g. bundled /assets/ icons", () => {
            expect(resolveCdnAssetUrls("/assets/tools/generic.svg")).toBe(
                "/assets/tools/generic.svg"
            );
        });

        it("leaves a plain string that is not a path untouched", () => {
            expect(resolveCdnAssetUrls("CRUSTY")).toBe("CRUSTY");
        });

        it("recurses into arrays and nested objects, matching content-data's real shape", () => {
            const project = {
                id: 1,
                name: "Esencha",
                image: [
                    { src: "/projects/image-esencha.png", isHero: true },
                    { src: "/projects/esencha/001.gif" },
                ],
            };

            expect(resolveCdnAssetUrls(project)).toEqual({
                id: 1,
                name: "Esencha",
                image: [
                    { src: "https://cdn-dev.avrash.com/projects/image-esencha.png", isHero: true },
                    { src: "https://cdn-dev.avrash.com/projects/esencha/001.gif" },
                ],
            });
        });

        it("passes through null, numbers and booleans inside an object unchanged", () => {
            const value = { rank: 2, featured: true, note: null };
            expect(resolveCdnAssetUrls(value)).toEqual(value);
        });
    });
});
