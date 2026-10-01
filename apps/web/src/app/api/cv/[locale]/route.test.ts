import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";

const mocks = vi.hoisted(() => ({ getCv: vi.fn(), readFile: vi.fn() }));
vi.mock("@/entities/cv/api/getCv", () => ({
    getCv: mocks.getCv,
    cvContentDirectory: () => "/content",
}));
vi.mock("node:fs/promises", () => ({ readFile: mocks.readFile }));

const document = {
    id: "5e7207f7-b763-4071-8e1b-6c513aecfb8a",
    fileName: "Alona CV.pdf",
    size: 5,
    updatedAt: "2026-09-27T12:00:00.000Z",
};
const download = (locale = "en") =>
    GET(new Request(`http://localhost/api/cv/${locale}`), {
        params: Promise.resolve({ locale }),
    });
const resolved = (locale = "en") => ({ locale, document });

beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CONTENT_SOURCE", "local");
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("public CV download", () => {
    it("downloads the saved PDF with attachment headers and no stale browser cache", async () => {
        mocks.getCv.mockResolvedValue(resolved());
        mocks.readFile.mockResolvedValue(Buffer.from("%PDF-"));
        const response = await download();
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("application/pdf");
        expect(response.headers.get("content-disposition")).toContain("attachment;");
        expect(response.headers.get("content-disposition")).toContain("Alona%20CV.pdf");
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(await response.text()).toBe("%PDF-");
    });
    it("serves the CV resolved for the requested language under its own file name", async () => {
        mocks.getCv.mockResolvedValue(resolved("pl"));
        mocks.readFile.mockResolvedValue(Buffer.from("%PDF-"));
        const response = await download("de");
        expect(mocks.getCv).toHaveBeenCalledWith("de");
        expect(response.status).toBe(200);
        expect(response.headers.get("content-language")).toBe("pl");
        expect(response.headers.get("content-disposition")).toContain(
            'filename="alona-avrash-cv-pl.pdf"'
        );
    });
    it("rejects malformed language segments without reading CV metadata", async () => {
        const response = await download("..%2Fsecret");
        expect(response.status).toBe(404);
        expect(mocks.getCv).not.toHaveBeenCalled();
    });
    it("returns 404 after deletion instead of the previously cached file", async () => {
        mocks.getCv.mockResolvedValue(null);
        const response = await download();
        expect(response.status).toBe(404);
        expect(response.headers.get("cache-control")).toBe("no-store");
        expect(mocks.readFile).not.toHaveBeenCalled();
    });
    it("fetches the UUID file from the configured CDN for the R2 deployment", async () => {
        vi.stubEnv("CONTENT_SOURCE", "remote");
        vi.stubEnv("CONTENT_CDN_URL", "https://cdn.example.com/");
        mocks.getCv.mockResolvedValue(resolved());
        const fetch = vi.fn().mockResolvedValue(new Response("%PDF-"));
        vi.stubGlobal("fetch", fetch);
        expect((await download()).status).toBe(200);
        expect(fetch).toHaveBeenCalledWith(
            `https://cdn.example.com/cv/uploads/${document.id}.pdf`,
            expect.objectContaining({ cache: "no-store", redirect: "error" })
        );
        expect(mocks.readFile).not.toHaveBeenCalled();
    });
    it("reports an unavailable stored file without serving an HTML response as PDF", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        mocks.getCv.mockResolvedValue(resolved());
        mocks.readFile.mockRejectedValue(new Error("missing file"));
        const response = await download();
        expect(response.status).toBe(503);
        expect(response.headers.get("content-type")).not.toBe("application/pdf");
    });
});
