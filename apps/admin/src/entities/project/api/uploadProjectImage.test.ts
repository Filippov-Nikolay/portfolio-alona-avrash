import sharp from "sharp";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
    finishProjectImageUploadAction,
    startProjectImageUploadAction,
    uploadProjectImageAction,
} from "./uploadProjectImage";

const mocks = vi.hoisted(() => ({
    driver: "filesystem" as "filesystem" | "r2",
    upload: vi.fn(),
    delete: vi.fn(),
    createGifPoster: vi.fn(),
    presignUpload: vi.fn(),
    objectSize: vi.fn(),
    readObject: vi.fn(),
    deleteObject: vi.fn(),
}));

vi.mock("@/shared/auth/requireAdminSession", () => ({ requireAdminSession: vi.fn() }));
vi.mock("@/shared/storage/driver", () => ({ getStorageDriver: () => mocks.driver }));
vi.mock("@/shared/storage/imageStorage", () => ({
    getImageStorage: () => ({ upload: mocks.upload, delete: mocks.delete }),
}));
vi.mock("@/shared/storage/r2", () => ({
    presignUpload: mocks.presignUpload,
    objectSize: mocks.objectSize,
    readObject: mocks.readObject,
    deleteObject: mocks.deleteObject,
}));
vi.mock("@/shared/lib/gifPoster", async (importOriginal) => ({
    ...(await importOriginal<typeof import("@/shared/lib/gifPoster")>()),
    createGifPoster: mocks.createGifPoster,
}));

const MB = 1024 * 1024;
const UPLOAD_ID = "0f8fad5b-d9cb-469f-a165-70867728950e";
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="2" height="2"><script>alert(1)</script></svg>`;

const pixel = () =>
    sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 255, g: 0, b: 0 } } });

const file = (bytes: Buffer | string, name: string, type: string) =>
    new File([new Uint8Array(Buffer.from(bytes))], name, { type });

beforeEach(() => {
    vi.clearAllMocks();
    mocks.driver = "filesystem";
    mocks.upload.mockImplementation(async (fileName: string) => ({
        src: `/projects/uploads/${fileName}`,
    }));
    mocks.delete.mockResolvedValue(undefined);
    mocks.deleteObject.mockResolvedValue(undefined);
    mocks.createGifPoster.mockResolvedValue(Buffer.from("poster"));
    mocks.presignUpload.mockResolvedValue("https://r2.example/signed");
});

describe("uploadProjectImageAction", () => {
    it("uploads other formats on their own, without a poster", async () => {
        const png = await pixel().png().toBuffer();
        const result = await uploadProjectImageAction(file(png, "Shot.png", "image/png"));
        expect(result).toEqual({
            ok: true,
            image: { src: expect.stringMatching(/^\/projects\/uploads\/\d+-shot\.png$/) },
        });
        expect(mocks.upload).toHaveBeenCalledWith(expect.any(String), png, "image/png");
        expect(mocks.createGifPoster).not.toHaveBeenCalled();
    });

    it("names and types the file by its content, not by what the client claims", async () => {
        const jpeg = await pixel().jpeg().toBuffer();
        const result = await uploadProjectImageAction(file(jpeg, "Photo.png", "image/svg+xml"));
        expect(result.ok && result.image.src).toMatch(/^\/projects\/uploads\/\d+-photo\.jpg$/);
        expect(mocks.upload).toHaveBeenCalledWith(expect.any(String), jpeg, "image/jpeg");
    });

    it.each([
        ["SVG labelled as a PNG", SVG],
        ["HTML labelled as a PNG", "<html>hi</html>"],
    ])("rejects %s with a message the editor can show", async (_case, bytes) => {
        expect(await uploadProjectImageAction(file(bytes, "image.png", "image/png"))).toEqual({
            ok: false,
            error: "Upload a JPEG, PNG, GIF, WebP or AVIF image.",
        });
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it("rejects files over 4 MB before reading them", async () => {
        const large = new File([new Uint8Array(4 * MB + 1)], "big.png", { type: "image/png" });
        expect(await uploadProjectImageAction(large)).toEqual({
            ok: false,
            error: "Image is too large (max 4 MB).",
        });
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it("stores a WebP poster next to an uploaded GIF and returns both", async () => {
        const gif = await pixel().gif().toBuffer();
        const result = await uploadProjectImageAction(file(gif, "Loop.gif", "image/gif"));
        if (!result.ok) throw new Error(result.error);
        expect(result.image.src).toMatch(/^\/projects\/uploads\/\d+-loop\.gif$/);
        expect(result.image.posterSrc).toBe(result.image.src.replace(/\.gif$/, "-poster.webp"));
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
        expect(await uploadProjectImageAction(file(gif, "Broken.gif", "image/gif"))).toEqual({
            ok: false,
            error: "This GIF could not be read. Export it again and retry.",
        });
        expect(mocks.upload).not.toHaveBeenCalled();
    });

    it("removes the uploaded GIF again when its poster cannot be stored", async () => {
        const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
        const gif = await pixel().gif().toBuffer();
        mocks.upload
            .mockImplementationOnce(async (fileName: string) => ({
                src: `/projects/uploads/${fileName}`,
            }))
            .mockRejectedValueOnce(new Error("storage down"));
        expect(await uploadProjectImageAction(file(gif, "Loop.gif", "image/gif"))).toEqual({
            ok: false,
            error: "Upload failed. Try again.",
        });
        expect(mocks.delete).toHaveBeenCalledWith(
            expect.stringMatching(/^\/projects\/uploads\/\d+-loop\.gif$/)
        );
        consoleError.mockRestore();
    });
});

describe("startProjectImageUploadAction", () => {
    it("keeps uploads within 4 MB on the action when files are stored locally", async () => {
        expect(await startProjectImageUploadAction({ size: MB, type: "image/png" })).toEqual({
            ok: true,
            ticket: { mode: "action" },
        });
        expect(await startProjectImageUploadAction({ size: 5 * MB, type: "image/gif" })).toEqual({
            ok: false,
            error: "Image is too large (max 4 MB).",
        });
        expect(mocks.presignUpload).not.toHaveBeenCalled();
    });

    it("issues a five-minute upload URL for a random incoming key on R2", async () => {
        mocks.driver = "r2";
        const result = await startProjectImageUploadAction({ size: 30 * MB, type: "image/gif" });
        if (!result.ok || result.ticket.mode !== "direct") throw new Error("expected a ticket");
        expect(result.ticket).toEqual({
            mode: "direct",
            uploadId: expect.stringMatching(/^[0-9a-f-]{36}$/),
            uploadUrl: "https://r2.example/signed",
            contentType: "image/gif",
        });
        expect(mocks.presignUpload).toHaveBeenCalledWith(
            `projects/uploads/incoming/${result.ticket.uploadId}`,
            "image/gif",
            300
        );
    });

    it.each([
        [{ size: 50 * MB + 1, type: "image/gif" }, "Image is too large (max 50 MB)."],
        [{ size: MB, type: "image/svg+xml" }, "Upload a JPEG, PNG, GIF, WebP or AVIF image."],
        [{ size: MB, type: "" }, "Upload a JPEG, PNG, GIF, WebP or AVIF image."],
    ])("refuses to sign %o", async (request, error) => {
        mocks.driver = "r2";
        expect(await startProjectImageUploadAction(request)).toEqual({ ok: false, error });
        expect(mocks.presignUpload).not.toHaveBeenCalled();
    });
});

describe("finishProjectImageUploadAction", () => {
    beforeEach(() => {
        mocks.driver = "r2";
    });

    it("validates and stores the uploaded object, then removes the incoming copy", async () => {
        const gif = await pixel().gif().toBuffer();
        mocks.objectSize.mockResolvedValue(gif.length);
        mocks.readObject.mockResolvedValue(new Uint8Array(gif));

        const result = await finishProjectImageUploadAction(UPLOAD_ID, "Big Loop.gif");
        expect(result.ok && result.image.src).toMatch(/^\/projects\/uploads\/\d+-big-loop\.gif$/);
        expect(result.ok && result.image.posterSrc).toMatch(/-big-loop-poster\.webp$/);
        expect(mocks.readObject).toHaveBeenCalledWith(`projects/uploads/incoming/${UPLOAD_ID}`);
        expect(mocks.deleteObject).toHaveBeenCalledWith(`projects/uploads/incoming/${UPLOAD_ID}`);
    });

    it("rejects an uploaded SVG and still removes the incoming copy", async () => {
        mocks.objectSize.mockResolvedValue(SVG.length);
        mocks.readObject.mockResolvedValue(new Uint8Array(Buffer.from(SVG)));

        expect(await finishProjectImageUploadAction(UPLOAD_ID, "icon.gif")).toEqual({
            ok: false,
            error: "Upload a JPEG, PNG, GIF, WebP or AVIF image.",
        });
        expect(mocks.upload).not.toHaveBeenCalled();
        expect(mocks.deleteObject).toHaveBeenCalledWith(`projects/uploads/incoming/${UPLOAD_ID}`);
    });

    it("rejects an object larger than the direct upload limit without reading it", async () => {
        mocks.objectSize.mockResolvedValue(50 * MB + 1);

        expect(await finishProjectImageUploadAction(UPLOAD_ID, "huge.gif")).toEqual({
            ok: false,
            error: "Image is too large (max 50 MB).",
        });
        expect(mocks.readObject).not.toHaveBeenCalled();
        expect(mocks.deleteObject).toHaveBeenCalled();
    });

    it.each(["../../content/projects.json", "not-a-uuid", ""])(
        "ignores upload id %j instead of touching other keys",
        async (uploadId) => {
            expect(await finishProjectImageUploadAction(uploadId, "x.gif")).toEqual({
                ok: false,
                error: "Unknown upload. Try again.",
            });
            expect(mocks.objectSize).not.toHaveBeenCalled();
            expect(mocks.deleteObject).not.toHaveBeenCalled();
        }
    );

    it("is unavailable when files are stored locally", async () => {
        mocks.driver = "filesystem";
        expect(await finishProjectImageUploadAction(UPLOAD_ID, "x.gif")).toEqual({
            ok: false,
            error: "Unknown upload. Try again.",
        });
        expect(mocks.objectSize).not.toHaveBeenCalled();
    });
});
