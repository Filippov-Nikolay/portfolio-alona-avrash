import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { detectImage } from "./imageFormat";

const image = (width = 3, height = 2) =>
    sharp({ create: { width, height, channels: 3, background: { r: 0, g: 128, b: 255 } } });

describe("detectImage", () => {
    it.each([
        ["jpeg", () => image().jpeg().toBuffer(), ".jpg", "image/jpeg"],
        ["png", () => image().png().toBuffer(), ".png", "image/png"],
        ["gif", () => image().gif().toBuffer(), ".gif", "image/gif"],
        ["webp", () => image().webp().toBuffer(), ".webp", "image/webp"],
        ["avif", () => image().avif().toBuffer(), ".avif", "image/avif"],
    ])("recognises %s from its bytes", async (format, encode, extension, contentType) => {
        expect(await detectImage(await encode())).toEqual({
            format,
            extension,
            contentType,
            width: 3,
            height: 2,
        });
    });

    it("recognises SVG without executing anything in it", async () => {
        const svg = Buffer.from(
            `<svg xmlns="http://www.w3.org/2000/svg" width="4" height="5"><script>alert(1)</script></svg>`
        );
        expect(await detectImage(svg)).toMatchObject({ format: "svg", width: 4, height: 5 });
    });

    it("returns null for bytes that are not an image", async () => {
        expect(await detectImage(Buffer.from("<html><body>hi</body></html>"))).toBeNull();
        expect(await detectImage(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0, 0, 0, 0]))).toBeNull();
        expect(await detectImage(Buffer.alloc(0))).toBeNull();
    });
});
