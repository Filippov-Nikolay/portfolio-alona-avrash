import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { createGifPoster, gifPosterFileName, isGifFileName } from "./gifPoster";

function frame(width: number, height: number, color: { r: number; g: number; b: number }) {
    return sharp({ create: { width, height, channels: 3, background: color } })
        .png()
        .toBuffer();
}

async function animatedGif(width: number, height: number) {
    const frames = await Promise.all([
        frame(width, height, { r: 255, g: 0, b: 0 }),
        frame(width, height, { r: 0, g: 0, b: 255 }),
    ]);
    return sharp(frames, { join: { animated: true } })
        .gif()
        .toBuffer();
}

describe("gifPoster", () => {
    it("recognises GIF names and derives the poster name next to them", () => {
        expect(isGifFileName("1700-loop.GIF")).toBe(true);
        expect(isGifFileName("1700-shot.png")).toBe(false);
        expect(gifPosterFileName("1700-loop.gif")).toBe("1700-loop-poster.webp");
    });

    it("captures the first frame of an animation as WebP", async () => {
        const poster = await createGifPoster(await animatedGif(40, 20));
        const image = sharp(poster);
        const metadata = await image.metadata();
        expect(metadata.format).toBe("webp");
        expect(metadata.pages ?? 1).toBe(1);
        expect([metadata.width, metadata.height]).toEqual([40, 20]);
        const { dominant } = await image.stats();
        expect(dominant.r).toBeGreaterThan(200);
        expect(dominant.b).toBeLessThan(60);
    });

    it("scales oversized frames down to 2560px wide and keeps the aspect ratio", async () => {
        const poster = await createGifPoster(await animatedGif(3200, 1000));
        const { width, height } = await sharp(poster).metadata();
        expect([width, height]).toEqual([2560, 800]);
    });

    it("rejects data that is not an image", async () => {
        await expect(createGifPoster(Buffer.from("not a gif"))).rejects.toThrow();
    });
});
