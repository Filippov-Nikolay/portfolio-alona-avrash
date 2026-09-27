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
function upload(bytes: string, name = "cv.pdf", type = "application/pdf") {
    const form = new FormData();
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
        expect((await GET(new Request(`${origin}/api/cv`))).status).toBe(401);
        expect((await POST(upload("%PDF-1.7\n%%EOF"))).status).toBe(401);
        expect(
            (
                await DELETE(
                    new Request(`${origin}/api/cv`, { method: "DELETE", headers: { origin } })
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
        expect((await DELETE(new Request(`${origin}/api/cv`, { method: "DELETE" }))).status).toBe(
            403
        );
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
        mocks.save.mockResolvedValue({ fileName: "cv.pdf" });
        const bytes = "%PDF-1.7\n1 0 obj\n<<>>\nendobj\n%%EOF\n";
        const response = await POST(upload(bytes));
        expect(response.status).toBe(200);
        expect(mocks.save).toHaveBeenCalledWith("cv.pdf", Buffer.from(bytes));
    });
    it("returns 404 when nothing is published", async () => {
        mocks.get.mockResolvedValue(null);
        expect((await GET(new Request(`${origin}/api/cv`))).status).toBe(404);
    });
});
