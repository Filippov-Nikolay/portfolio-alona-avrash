import { afterEach, describe, expect, it, vi } from "vitest";
import { createRequire } from "node:module";
import sharp from "sharp";

const { readFile, stat } = vi.hoisted(() => ({ readFile: vi.fn(), stat: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile, stat }));
import { GET } from "./route";

const request = (src: string) =>
    new Request(`https://site.test/api/gallery-poster?src=${encodeURIComponent(src)}`);
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.clearAllMocks();
});

describe("gallery poster", () => {
    it("shares a compatible native image runtime with Next's image optimizer", async () => {
        vi.stubEnv("CONTENT_CDN_URL", "");
        // Different libvips DLL versions in the same Windows process can make
        // this endpoint fail only after Next has optimized its first image.
        const nextSharp: typeof sharp = createRequire(import.meta.resolve("next/package.json"))(
            "sharp"
        );
        const gif = await nextSharp({
            create: { width: 40, height: 30, channels: 3, background: "#ab2345" },
        })
            .gif()
            .toBuffer();
        stat.mockResolvedValue({ size: gif.length });
        readFile.mockResolvedValue(gif);
        const response = await GET(request("/projects/test/shared-runtime.gif"));
        expect(response.status).toBe(200);
        expect(await sharp(Buffer.from(await response.arrayBuffer())).metadata()).toMatchObject({
            format: "webp",
            width: 40,
            height: 30,
        });
    });

    it.each([
        "https://untrusted.test/projects/a.gif",
        "//untrusted.test/projects/a.gif",
        "/projects/%2e%2e%2fsecret.gif",
        "/uploads/a.png",
        "/projects/a.gif?redirect=1",
        "/projects/a\\..\\secret.gif",
        "/private/a.gif",
    ])("rejects non-gallery sources: %s", async (src) => {
        expect((await GET(request(src))).status).toBe(400);
        expect(readFile).not.toHaveBeenCalled();
    });

    it("generates a bounded, static WebP and coalesces identical requests", async () => {
        vi.stubEnv("CONTENT_CDN_URL", "");
        const pixels = Buffer.alloc(1600 * 1600 * 3);
        pixels.fill(Buffer.from([200, 20, 30]), 0, pixels.length / 2);
        pixels.fill(Buffer.from([20, 30, 200]), pixels.length / 2);
        const gif = await sharp(pixels, {
            raw: { width: 1600, height: 1600, channels: 3, pageHeight: 800 },
        })
            .gif({ delay: [100, 100], loop: 0 })
            .toBuffer();
        expect((await sharp(gif).metadata()).pages).toBe(2);
        stat.mockResolvedValue({ size: gif.length });
        readFile.mockResolvedValue(gif);
        const responses = await Promise.all([
            GET(request("/projects/test/static.gif")),
            GET(request("/projects/test/static.gif")),
        ]);
        expect(readFile).toHaveBeenCalledTimes(1);
        for (const response of responses) {
            expect(response.status).toBe(200);
            expect(response.headers.get("cache-control")).toContain("s-maxage=86400");
            const metadata = await sharp(Buffer.from(await response.arrayBuffer())).metadata();
            expect(metadata).toMatchObject({ format: "webp", width: 1200, height: 600 });
            expect(metadata.pages ?? 1).toBe(1);
        }
    });

    it("uses only the configured CDN and refuses redirects", async () => {
        vi.stubEnv("CONTENT_CDN_URL", "https://cdn.test");
        const fetch = vi.fn().mockRejectedValue(new Error("redirect blocked"));
        vi.stubGlobal("fetch", fetch);
        expect((await GET(request("https://cdn.test/projects/test/cdn.gif"))).status).toBe(404);
        expect(fetch).toHaveBeenCalledWith(
            "https://cdn.test/projects/test/cdn.gif",
            expect.objectContaining({ redirect: "error" })
        );
        expect(
            (await GET(request("https://cdn.test.evil.test/projects/test/cdn.gif"))).status
        ).toBe(400);
        expect(fetch).toHaveBeenCalledTimes(1);
    });

    it("rejects oversized input before reading or decoding it", async () => {
        vi.stubEnv("CONTENT_CDN_URL", "");
        stat.mockResolvedValue({ size: 21 * 1024 * 1024 });
        expect((await GET(request("/projects/test/large.gif"))).status).toBe(404);
        expect(readFile).not.toHaveBeenCalled();
    });
});
