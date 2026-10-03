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

const file = (name: string, type: string) => new File([new Uint8Array([1, 2, 3])], name, { type });

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
        const result = await uploadProjectImageAction(file("Shot.png", "image/png"));
        expect(result.src).toMatch(/^\/projects\/uploads\/\d+-shot\.png$/);
        expect(result).not.toHaveProperty("posterSrc");
        expect(mocks.upload).toHaveBeenCalledOnce();
        expect(mocks.createGifPoster).not.toHaveBeenCalled();
    });

    it("stores a WebP poster next to an uploaded GIF and returns both", async () => {
        const result = await uploadProjectImageAction(file("Loop.gif", "image/gif"));
        expect(result.src).toMatch(/^\/projects\/uploads\/(\d+)-loop\.gif$/);
        expect(result.posterSrc).toBe(result.src.replace(/\.gif$/, "-poster.webp"));
        expect(mocks.upload).toHaveBeenCalledTimes(2);
        expect(mocks.upload.mock.calls[1]).toEqual([
            expect.stringMatching(/-loop-poster\.webp$/),
            Buffer.from("poster"),
            "image/webp",
        ]);
    });

    it("rejects an unreadable GIF before uploading anything", async () => {
        mocks.createGifPoster.mockRejectedValueOnce(new Error("bad gif"));
        await expect(uploadProjectImageAction(file("Broken.gif", "image/gif"))).rejects.toThrow(
            "This GIF could not be read"
        );
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it("removes the uploaded GIF again when its poster cannot be stored", async () => {
        mocks.upload
            .mockImplementationOnce(async (fileName: string) => ({
                src: `/projects/uploads/${fileName}`,
            }))
            .mockRejectedValueOnce(new Error("storage down"));
        await expect(uploadProjectImageAction(file("Loop.gif", "image/gif"))).rejects.toThrow(
            "storage down"
        );
        expect(mocks.delete).toHaveBeenCalledWith(
            expect.stringMatching(/^\/projects\/uploads\/\d+-loop\.gif$/)
        );
    });
});
