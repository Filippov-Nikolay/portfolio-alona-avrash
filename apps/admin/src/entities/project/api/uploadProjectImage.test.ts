import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { uploadProjectImageAction } from "./uploadProjectImage";

const mocks = vi.hoisted(() => ({
    upload: vi.fn(),
    delete: vi.fn(),
    createGifPoster: vi.fn(),
}));

vi.mock("@/shared/auth/requireAdminSession", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/shared/storage/imageStorage", () => ({
    getImageStorage: () => ({ upload: mocks.upload, delete: mocks.delete }),
}));
vi.mock("@/shared/lib/gifPoster", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/shared/lib/gifPoster")>()),
    createGifPoster: mocks.createGifPoster,
}));

const pixel = () =>
    sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 255, g: 0, b: 0 } } });

const file = (bytes: Buffer | string, name: string, type: string) =>
    new File([new Uint8Array(Buffer.from(bytes))], name, { type });

beforeEach(() => {
    vi.clearAllMocks();
    mocks.upload.mockImplementation(async (fileName: string) => ({
        src: `/projects/uploads/${fileName}`,
    }));
    mocks.delete.mockResolvedValue(undefined);
    mocks.createGifPoster.mockResolvedValue(Buffer.from("poster"));
});

describe("uploadProjectImageAction", () => {
    it("uploads other formats on their own, without a poster", async () => {
        const png = await pixel().png().toBuffer();
        const result = await uploadProjectImageAction(file(png, "Shot.png", "image/png"));
        expect(result.src).toMatch(/^\/projects\/uploads\/\d+-shot\.png$/);
        expect(result).not.toHaveProperty("posterSrc");
        expect(mocks.upload).toHaveBeenCalledWith(expect.any(String), png, "image/png");
        expect(mocks.createGifPoster).not.toHaveBeenCalled();
    });

    it("names and types the file by its content, not by what the client claims", async () => {
        const jpeg = await pixel().jpeg().toBuffer();
        const result = await uploadProjectImageAction(file(jpeg, "Photo.png", "image/svg+xml"));
        expect(result.src).toMatch(/^\/projects\/uploads\/\d+-photo\.jpg$/);
        expect(mocks.upload).toHaveBeenCalledWith(expect.any(String), jpeg, "image/jpeg");
    });

    it("rejects SVG even when it is labelled as a PNG", async () => {
        const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><script>alert(1)</script></svg>`;
        await expect(uploadProjectImageAction(file(svg, "icon.png", "image/png"))).rejects.toThrow(
            "Upload a JPEG, PNG, GIF, WebP or AVIF image."
        );
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it("rejects files that are not images whatever their name and type", async () => {
        await expect(
            uploadProjectImageAction(file("<html>hi</html>", "page.png", "image/png"))
        ).rejects.toThrow("Upload a JPEG, PNG, GIF, WebP or AVIF image.");
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it("rejects files over 4 MB before reading them", async () => {
        const large = new File([new Uint8Array(4 * 1024 * 1024 + 1)], "big.png", {
            type: "image/png",
        });
        await expect(uploadProjectImageAction(large)).rejects.toThrow(
            "Image is too large (max 4 MB)."
        );
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it("stores a WebP poster next to an uploaded GIF and returns both", async () => {
        const gif = await pixel().gif().toBuffer();
        const result = await uploadProjectImageAction(file(gif, "Loop.gif", "image/gif"));
        expect(result.src).toMatch(/^\/projects\/uploads\/(\d+)-loop\.gif$/);
        expect(result.posterSrc).toBe(result.src.replace(/\.gif$/, "-poster.webp"));
        expect(mocks.upload).toHaveBeenCalledTimes(2);
        expect(mocks.upload.mock.calls[0]![2]).toBe("image/gif");
        expect(mocks.upload.mock.calls[1]).toEqual([
            expect.stringMatching(/-loop-poster\.webp$/),
            Buffer.from("poster"),
            "image/webp",
        ]);
    });

    it("rejects an unreadable GIF before uploading anything", async () => {
        const gif = await pixel().gif().toBuffer();
        mocks.createGifPoster.mockRejectedValueOnce(new Error("bad gif"));
        await expect(
            uploadProjectImageAction(file(gif, "Broken.gif", "image/gif"))
        ).rejects.toThrow("This GIF could not be read");
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it("removes the uploaded GIF again when its poster cannot be stored", async () => {
        const gif = await pixel().gif().toBuffer();
        mocks.upload
            .mockImplementationOnce(async (fileName: string) => ({
                src: `/projects/uploads/${fileName}`,
            }))
            .mockRejectedValueOnce(new Error("storage down"));
        await expect(uploadProjectImageAction(file(gif, "Loop.gif", "image/gif"))).rejects.toThrow(
            "storage down"
        );
        expect(mocks.delete).toHaveBeenCalledWith(
            expect.stringMatching(/^\/projects\/uploads\/\d+-loop\.gif$/)
        );
    });
});
