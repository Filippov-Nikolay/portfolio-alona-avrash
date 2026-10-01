import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "./route";
import { resolveCv, type CvContent } from "@avrash/content-schema";

const mocks = vi.hoisted(() => ({ getCv: vi.fn(), getCvFile: vi.fn() }));
vi.mock("@/entities/cv/api/getCv", () => ({
    getCv: mocks.getCv,
    cvContentDirectory: () => "/content",
}));
vi.mock("@/entities/cv/api/getCvFile", () => ({ getCvFile: mocks.getCvFile }));

const document = {
    id: "5e7207f7-b763-4071-8e1b-6c513aecfb8a",
    fileName: "Alona CV.pdf",
    size: 5,
    updatedAt: "2026-09-27T12:00:00.000Z",
};
const download = (locale = "en", headers?: HeadersInit) =>
    GET(new Request(`http://localhost/api/cv/${locale}`, { headers }), {
        params: Promise.resolve({ locale }),
    });
const resolved = (locale = "en") => ({ locale, document });

beforeEach(() => {
    vi.resetAllMocks();
    vi.stubEnv("CONTENT_SOURCE", "local");
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
});

describe("public CV download", () => {
    it.each([
        [["pl"], ["pl", "pl", "pl"]],
        [["en"], ["en", "en", "en"]],
        [
            ["en", "pl"],
            ["en", "pl", "en"],
        ],
        [
            ["en", "pl", "ru"],
            ["en", "pl", "ru"],
        ],
    ])("resolves %j for EN, PL and RU as %j", async (uploaded, expected) => {
        const files: CvContent["files"] = Object.fromEntries(
            uploaded.map((locale) => [locale, { ...document, fileName: `${locale}.pdf` }])
        );
        mocks.getCv.mockImplementation(async (locale: string) => resolveCv({ files }, locale));
        mocks.getCvFile.mockResolvedValue(Buffer.from("%PDF-"));
        for (const [index, locale] of ["en", "pl", "ru"].entries()) {
            const response = await download(locale);
            expect(response.status).toBe(200);
            expect(response.headers.get("content-language")).toBe(expected[index]);
        }
    });
    it("validates an unchanged version without loading PDF bytes again", async () => {
        mocks.getCv.mockResolvedValue(resolved());
        const response = await download("pl", { "If-None-Match": `W/"${document.id}"` });
        expect(response.status).toBe(304);
        expect(response.headers.get("etag")).toBe(`"${document.id}"`);
        expect(response.headers.get("cache-control")).toBe("private, no-cache");
        expect(mocks.getCvFile).not.toHaveBeenCalled();
    });
    it("refreshes a cached fallback when the requested language is uploaded", async () => {
        const polish = { ...document, id: "22222222-2222-4222-8222-222222222222" };
        mocks.getCv.mockResolvedValue({ locale: "pl", document: polish });
        mocks.getCvFile.mockResolvedValue(Buffer.from("%PDF-"));
        const response = await download("pl", { "If-None-Match": `"${document.id}"` });
        expect(response.status).toBe(200);
        expect(response.headers.get("etag")).toBe(`"${polish.id}"`);
        expect(response.headers.get("content-language")).toBe("pl");
        expect(mocks.getCvFile).toHaveBeenCalledWith(polish);
    });
    it("recovers if a CV is replaced between reading its metadata and file", async () => {
        const replacement = { ...document, id: "22222222-2222-4222-8222-222222222222" };
        mocks.getCv
            .mockResolvedValueOnce(resolved())
            .mockResolvedValueOnce({ locale: "en", document: replacement });
        mocks.getCvFile
            .mockRejectedValueOnce(new Error("old file removed"))
            .mockResolvedValueOnce(Buffer.from("%PDF-"));
        const response = await download();
        expect(response.status).toBe(200);
        expect(response.headers.get("etag")).toBe(`"${replacement.id}"`);
    });
    it("downloads the saved PDF with attachment headers and version validation", async () => {
        mocks.getCv.mockResolvedValue(resolved());
        mocks.getCvFile.mockResolvedValue(Buffer.from("%PDF-"));
        const response = await download();
        expect(response.status).toBe(200);
        expect(response.headers.get("content-type")).toBe("application/pdf");
        expect(response.headers.get("content-disposition")).toContain("attachment;");
        expect(response.headers.get("content-disposition")).toContain("Alona%20CV.pdf");
        expect(response.headers.get("cache-control")).toBe("private, no-cache");
        expect(response.headers.get("etag")).toBe(`"${document.id}"`);
        expect(await response.text()).toBe("%PDF-");
    });
    it("serves the CV resolved for the requested language under its own file name", async () => {
        mocks.getCv.mockResolvedValue(resolved("pl"));
        mocks.getCvFile.mockResolvedValue(Buffer.from("%PDF-"));
        const response = await download("de");
        expect(mocks.getCv).toHaveBeenCalledWith("de", { fresh: true });
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
        expect(mocks.getCvFile).not.toHaveBeenCalled();
    });
    it("reports an unavailable stored file without serving an HTML response as PDF", async () => {
        vi.spyOn(console, "error").mockImplementation(() => {});
        mocks.getCv.mockResolvedValue(resolved());
        mocks.getCvFile.mockRejectedValue(new Error("missing file"));
        const response = await download();
        expect(response.status).toBe(503);
        expect(response.headers.get("content-type")).not.toBe("application/pdf");
    });
});
