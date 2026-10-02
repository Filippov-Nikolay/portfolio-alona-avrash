import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { readFile } = vi.hoisted(() => ({ readFile: vi.fn() }));
vi.mock("node:fs/promises", () => ({ readFile }));
vi.mock("./getCv", () => ({ cvContentDirectory: () => "/cv-test" }));
const bytes = Buffer.from("%PDF-1.7\n%%EOF\n");
const document = {
    id: "11111111-1111-4111-8111-111111111111",
    fileName: "CV.pdf",
    size: bytes.length,
    updatedAt: "2026-10-01T00:00:00.000Z",
};

beforeEach(() => {
    vi.resetModules();
    vi.resetAllMocks();
    vi.stubEnv("CONTENT_SOURCE", "local");
    readFile.mockResolvedValue(bytes);
});
afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
});

describe("CV file cache", () => {
    it("shares concurrent and repeated reads of the same version", async () => {
        const { getCvFile } = await import("./getCvFile");
        await Promise.all(Array.from({ length: 10 }, () => getCvFile(document)));
        expect(await getCvFile(document)).toEqual(bytes);
        expect(readFile).toHaveBeenCalledTimes(1);
    });
    it("loads replacements separately and bounds retained files", async () => {
        const { getCvFile } = await import("./getCvFile");
        for (const id of ["a", "b", "c", "d", "d", "a"]) await getCvFile({ ...document, id });
        expect(readFile).toHaveBeenCalledTimes(5);
    });
    it("retries failed reads and rejects truncated or non-PDF content", async () => {
        const { getCvFile } = await import("./getCvFile");
        readFile.mockResolvedValueOnce(Buffer.from("<html>bad</html>"));
        await expect(getCvFile(document)).rejects.toThrow("not a complete PDF");
        expect(await getCvFile(document)).toEqual(bytes);
        expect(readFile).toHaveBeenCalledTimes(2);
    });
    it("caches a PDF above 2 MB without using the Next fetch cache", async () => {
        vi.stubEnv("CONTENT_SOURCE", "remote");
        vi.stubEnv("CONTENT_CDN_URL", "https://cdn.example.com");
        const large = Buffer.alloc(3 * 1024 * 1024, 32);
        large.write("%PDF-1.7\n");
        large.write("\n%%EOF\n", large.length - 7);
        const fetch = vi.fn().mockResolvedValue(new Response(large));
        vi.stubGlobal("fetch", fetch);
        const { getCvFile } = await import("./getCvFile");
        const version = { ...document, size: large.length };
        await getCvFile(version);
        await getCvFile(version);
        expect(fetch).toHaveBeenCalledTimes(1);
        expect(fetch).toHaveBeenCalledWith(
            `https://cdn.example.com/cv/uploads/${document.id}.pdf`,
            expect.objectContaining({ cache: "no-store", redirect: "error" })
        );
    });
});
