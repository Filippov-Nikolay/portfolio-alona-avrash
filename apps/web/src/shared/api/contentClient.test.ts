import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { stats as bundledStats } from "@avrash/content-data";
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fetchContent, resolveCdnAssetUrls } from "./contentClient";

const remoteStats = [{ id: 0, value: "99K+", label: "project views" }];
const contentDir = mkdtempSync(path.join(tmpdir(), "avrash-content-"));

afterAll(() => {
    rmSync(contentDir, { recursive: true, force: true });
});

describe("fetchContent", () => {
    afterEach(() => {
        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
        vi.restoreAllMocks();
    });

    it("serves the bundled content by default", async () => {
        expect(await fetchContent("stats")).toEqual(bundledStats);
    });

    it("reads every resource from CONTENT_DIR with CONTENT_SOURCE=directory", async () => {
        writeFileSync(path.join(contentDir, "stats.json"), JSON.stringify(remoteStats));
        vi.stubEnv("CONTENT_SOURCE", "directory");
        vi.stubEnv("CONTENT_DIR", contentDir);
        expect(await fetchContent("stats")).toEqual(remoteStats);
    });

    it("fails loudly when directory content breaks its schema", async () => {
        writeFileSync(path.join(contentDir, "cta.json"), JSON.stringify({ i18n: { pl: {} } }));
        vi.stubEnv("CONTENT_SOURCE", "directory");
        vi.stubEnv("CONTENT_DIR", contentDir);
        await expect(fetchContent("cta")).rejects.toThrow();
    });

    it("requires CONTENT_DIR for the directory source", async () => {
        vi.stubEnv("CONTENT_SOURCE", "directory");
        vi.stubEnv("CONTENT_DIR", "");
        await expect(fetchContent("stats")).rejects.toThrow("requires CONTENT_DIR");
    });

    describe("with CONTENT_SOURCE=remote", () => {
        beforeEach(() => {
            vi.stubEnv("CONTENT_SOURCE", "remote");
            vi.stubEnv("CONTENT_CDN_URL", "https://cdn.example");
            vi.spyOn(console, "error").mockImplementation(() => {});
        });

        it("uses valid remote content and tags the fetch with the resource", async () => {
            const fetchMock = vi.fn(async () => Response.json(remoteStats));
            vi.stubGlobal("fetch", fetchMock);
            expect(await fetchContent("stats")).toEqual(remoteStats);
            expect(fetchMock).toHaveBeenCalledWith(
                "https://cdn.example/content/stats.json",
                expect.objectContaining({ next: expect.objectContaining({ tags: ["stats"] }) })
            );
        });

        it("falls back to bundled content when remote content breaks its schema", async () => {
            vi.stubGlobal(
                "fetch",
                vi.fn(async () => Response.json([{ id: "zero", value: 58 }]))
            );
            expect(await fetchContent("stats")).toEqual(bundledStats);
            expect(console.error).toHaveBeenCalledWith(
                expect.stringContaining('remote "stats" does not match its schema')
            );
        });

        it.each([
            ["answers 404", async () => new Response("missing", { status: 404 })],
            [
                "is unreachable",
                async () => {
                    throw new TypeError("network");
                },
            ],
        ])("falls back to bundled content when R2 %s", async (_case, respond) => {
            vi.stubGlobal("fetch", vi.fn(respond));
            expect(await fetchContent("stats")).toEqual(bundledStats);
        });
    });
});

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
