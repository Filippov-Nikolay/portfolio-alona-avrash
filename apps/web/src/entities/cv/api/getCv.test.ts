import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const document = {
    id: "11111111-1111-4111-8111-111111111111",
    fileName: "English.pdf",
    size: 100,
    updatedAt: "2026-10-01T00:00:00.000Z",
};
const polish = { ...document, id: "22222222-2222-4222-8222-222222222222", fileName: "Polish.pdf" };

beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("CONTENT_SOURCE", "remote");
    vi.stubEnv("CONTENT_CDN_URL", "https://cdn.example.com");
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("CV metadata", () => {
    it("checks current uploads on download even when the page previously resolved a fallback", async () => {
        const fetch = vi
            .fn()
            .mockResolvedValueOnce(Response.json({ files: { en: document } }))
            .mockResolvedValueOnce(Response.json({ files: { en: document, pl: polish } }));
        vi.stubGlobal("fetch", fetch);
        const { getCv } = await import("./getCv");
        expect((await getCv("pl"))?.locale).toBe("en");
        expect((await getCv("pl", { fresh: true }))?.locale).toBe("pl");
        expect(fetch.mock.calls[0][1]).toMatchObject({ next: { tags: ["cv"], revalidate: 30 } });
        expect(fetch.mock.calls[1][1]).toMatchObject({
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
        });
    });
    it("shares simultaneous metadata checks across download languages", async () => {
        const fetch = vi
            .fn()
            .mockResolvedValue(Response.json({ files: { en: document, pl: polish } }));
        vi.stubGlobal("fetch", fetch);
        const { getCv } = await import("./getCv");
        const values = await Promise.all([
            getCv("en", { fresh: true }),
            getCv("pl", { fresh: true }),
        ]);
        expect(values.map((value) => value?.locale)).toEqual(["en", "pl"]);
        expect(fetch).toHaveBeenCalledTimes(1);
    });
});
