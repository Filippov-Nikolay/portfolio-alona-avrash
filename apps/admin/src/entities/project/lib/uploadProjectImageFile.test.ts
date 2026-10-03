import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { uploadProjectImageFile } from "./uploadProjectImageFile";

const actions = vi.hoisted(() => ({
    start: vi.fn(),
    finish: vi.fn(),
    upload: vi.fn(),
}));

vi.mock("../api/uploadProjectImage", () => ({
    startProjectImageUploadAction: actions.start,
    finishProjectImageUploadAction: actions.finish,
    uploadProjectImageAction: actions.upload,
}));

const fetchMock = vi.fn();
const gif = new File([new Uint8Array([1, 2, 3])], "loop.gif", { type: "image/gif" });
const stored = { ok: true, image: { src: "https://cdn.example/loop.gif" } };

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("uploadProjectImageFile", () => {
    it("sends the file through the action when the server asks for it", async () => {
        actions.start.mockResolvedValue({ ok: true, ticket: { mode: "action" } });
        actions.upload.mockResolvedValue(stored);

        expect(await uploadProjectImageFile(gif)).toBe(stored);
        expect(actions.start).toHaveBeenCalledWith({ size: 3, type: "image/gif" });
        expect(actions.upload).toHaveBeenCalledWith(gif);
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("puts the file straight into storage, then lets the server finish it", async () => {
        actions.start.mockResolvedValue({
            ok: true,
            ticket: {
                mode: "direct",
                uploadId: "id-1",
                uploadUrl: "https://r2.example/signed",
                contentType: "image/gif",
            },
        });
        fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
        actions.finish.mockResolvedValue(stored);

        expect(await uploadProjectImageFile(gif)).toBe(stored);
        expect(fetchMock).toHaveBeenCalledWith("https://r2.example/signed", {
            method: "PUT",
            body: gif,
            headers: { "Content-Type": "image/gif" },
        });
        expect(actions.finish).toHaveBeenCalledWith("id-1", "loop.gif");
        expect(actions.upload).not.toHaveBeenCalled();
    });

    it.each([
        ["rejects", () => fetchMock.mockRejectedValue(new TypeError("network"))],
        ["answers 403", () => fetchMock.mockResolvedValue(new Response(null, { status: 403 }))],
    ])("reports a failed storage upload when R2 %s", async (_case, arrange) => {
        actions.start.mockResolvedValue({
            ok: true,
            ticket: { mode: "direct", uploadId: "id-1", uploadUrl: "u", contentType: "image/gif" },
        });
        arrange();

        expect(await uploadProjectImageFile(gif)).toEqual({
            ok: false,
            error: "Upload to storage failed. Try again.",
        });
        expect(actions.finish).not.toHaveBeenCalled();
    });

    it("returns the server's refusal without uploading", async () => {
        actions.start.mockResolvedValue({ ok: false, error: "Image is too large (max 4 MB)." });

        expect(await uploadProjectImageFile(gif)).toEqual({
            ok: false,
            error: "Image is too large (max 4 MB).",
        });
        expect(fetchMock).not.toHaveBeenCalled();
        expect(actions.upload).not.toHaveBeenCalled();
    });

    it("refuses files over 50 MB without asking the server", async () => {
        const huge = { name: "huge.gif", size: 50 * 1024 * 1024 + 1, type: "image/gif" } as File;

        expect(await uploadProjectImageFile(huge)).toEqual({
            ok: false,
            error: "Image is too large (max 50 MB).",
        });
        expect(actions.start).not.toHaveBeenCalled();
    });
});
