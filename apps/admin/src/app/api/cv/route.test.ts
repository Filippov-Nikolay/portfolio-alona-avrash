import { beforeEach, describe, expect, it, vi } from "vitest";
import { MAX_CV_BYTES } from "@avrash/content-schema";
import { DELETE, GET, POST } from "./route";

const mocks = vi.hoisted(() => ({
    auth: vi.fn(),
    get: vi.fn(),
    save: vi.fn(),
    remove: vi.fn(),
    download: vi.fn(),
}));
vi.mock("@/shared/auth/requireAdminSession", () => ({ requireAdminSession: mocks.auth }));
vi.mock("@/entities/cv/api/cvRepository", () => ({ getCvRepository: () => mocks }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/shared/lib/notifyWeb", () => ({ notifyContentChanged: vi.fn() }));

const origin = "http://localhost:3001";
function upload(bytes: string, name = "cv.pdf", type = "application/pdf", locale = "en") {
    const form = new FormData();
    form.set("locale", locale);
    form.set("file", new File([bytes], name, { type }));
    return new Request(`${origin}/api/cv`, { method: "POST", headers: { origin }, body: form });
}
beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ login: "test" });
});

describe("CV API", () => {
    it("rejects unauthenticated reads and writes", async () => {
        mocks.auth.mockRejectedValue(new Error("no session"));
        expect((await GET(new Request(`${origin}/api/cv?locale=en`))).status).toBe(401);
        expect((await GET(new Request(`${origin}/api/cv?locale=en&v=x`))).status).toBe(401);
        expect((await POST(upload("%PDF-1.7\n%%EOF"))).status).toBe(401);
        expect(
            (
                await DELETE(
                    new Request(`${origin}/api/cv?locale=en`, {
                        method: "DELETE",
                        headers: { origin },
                    })
                )
            ).status
        ).toBe(401);
        expect(mocks.save).not.toHaveBeenCalled();
        expect(mocks.remove).not.toHaveBeenCalled();
    });
    it("rejects cross-origin mutations", async () => {
        const request = upload("%PDF-1.7\n%%EOF");
        request.headers.set("origin", "https://untrusted.example");
        expect((await POST(request)).status).toBe(403);
        expect(
            (await DELETE(new Request(`${origin}/api/cv?locale=en`, { method: "DELETE" }))).status
        ).toBe(403);
        expect(mocks.save).not.toHaveBeenCalled();
        expect(mocks.remove).not.toHaveBeenCalled();
    });
    it("rejects empty, disguised, truncated and oversized PDFs", async () => {
        for (const request of [
            upload(""),
            upload("<html>not a pdf</html>"),
            upload("%PDF-1.7\ntruncated"),
            upload("%PDF-1.7\n%%EOF", "cv.html", "text/html"),
            upload("x".repeat(MAX_CV_BYTES + 1)),
        ]) {
            expect((await POST(request)).status).toBe(400);
        }
        expect(mocks.save).not.toHaveBeenCalled();
    });
    it("accepts a PDF after validating the actual bytes", async () => {
        mocks.save.mockResolvedValue({ files: {} });
        const bytes = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n";
        const response = await POST(upload(bytes, "cv.pdf", "application/pdf", "pl"));
        expect(response.status).toBe(200);
        expect(mocks.save).toHaveBeenCalledWith("pl", "cv.pdf", Buffer.from(bytes));
    });
    it("only accepts uploads for a language the website offers", async () => {
        const bytes = "%PDF-1.7\n%%EOF\n";
        for (const locale of ["", "xx", "../en"]) {
            expect((await POST(upload(bytes, "cv.pdf", "application/pdf", locale))).status).toBe(
                400
            );
        }
        expect(mocks.save).not.toHaveBeenCalled();
    });
    it("previews and deletes the CV of the requested language only", async () => {
        mocks.get.mockResolvedValue({ files: { en: { id: "x", fileName: "en.pdf" } } });
        mocks.download.mockResolvedValue(new Uint8Array([37]));
        expect((await GET(new Request(`${origin}/api/cv?locale=en`))).status).toBe(200);
        expect((await GET(new Request(`${origin}/api/cv?locale=pl`))).status).toBe(404);
        expect((await GET(new Request(`${origin}/api/cv?locale=../en`))).status).toBe(400);
        mocks.remove.mockResolvedValue({ files: {} });
        const response = await DELETE(
            new Request(`${origin}/api/cv?locale=pl`, { method: "DELETE", headers: { origin } })
        );
        expect(response.status).toBe(200);
        expect(mocks.remove).toHaveBeenCalledWith("pl");
    });
    it("allows private caching only for the current document's versioned URL", async () => {
        mocks.get.mockResolvedValue({ files: { en: { id: "current", fileName: "en.pdf" } } });
        mocks.download.mockResolvedValue(new Uint8Array([37]));
        const versioned = await GET(new Request(`${origin}/api/cv?locale=en&v=current`));
        expect(versioned.status).toBe(200);
        expect(versioned.headers.get("cache-control")).toBe("private, max-age=31536000, immutable");
        const latest = await GET(new Request(`${origin}/api/cv?locale=en`));
        expect(latest.headers.get("cache-control")).toBe("private, no-store");
    });
    it("does not serve a replacement under an old document's cache key", async () => {
        mocks.get.mockResolvedValue({ files: { en: { id: "replacement", fileName: "en.pdf" } } });
        const old = await GET(new Request(`${origin}/api/cv?locale=en&v=old`));
        expect(old.status).toBe(404);
        expect(old.headers.get("cache-control")).toBe("private, no-store");
        expect(mocks.download).not.toHaveBeenCalled();
    });
});
