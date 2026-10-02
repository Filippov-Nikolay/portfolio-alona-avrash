import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

beforeEach(() => vi.resetModules());
afterEach(() => vi.unstubAllGlobals());

describe("CV browser download", () => {
    it.each([
        new Response("Unavailable", { status: 503 }),
        new Response("<html>Sign in</html>", { headers: { "Content-Type": "text/html" } }),
        new Response("%PDF-1.7\ntruncated", { headers: { "Content-Type": "application/pdf" } }),
    ])("rejects error pages and incomplete PDFs", async (response) => {
        const { downloadCv } = await import("./downloadCv");
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
        await expect(downloadCv("/api/cv/pl", new AbortController().signal)).rejects.toThrow();
    });
    it("uses the served language and UTF-8 filename", async () => {
        const { downloadCv } = await import("./downloadCv");
        vi.stubGlobal(
            "fetch",
            vi.fn().mockResolvedValue(
                new Response("%PDF-1.7\n%%EOF", {
                    headers: {
                        "Content-Type": "application/pdf",
                        "Content-Language": "pl",
                        "Content-Disposition":
                            "attachment; filename=\"cv.pdf\"; filename*=UTF-8''CV%20po%20polsku.pdf",
                    },
                })
            )
        );
        const result = await downloadCv("/api/cv/pl", new AbortController().signal);
        expect(result.locale).toBe("pl");
        expect(result.fileName).toBe("CV po polsku.pdf");
        expect(result.blob.type).toBe("application/pdf");
    });
    it("reuses the PDF on 304 and replaces it when the version changes", async () => {
        const response = (locale: string, etag: string) =>
            new Response(`%PDF-1.7\n${locale}\n%%EOF`, {
                headers: {
                    "Content-Type": "application/pdf",
                    "Content-Language": locale,
                    ETag: etag,
                },
            });
        const fetch = vi
            .fn()
            .mockResolvedValueOnce(response("en", '"first"'))
            .mockResolvedValueOnce(new Response(null, { status: 304 }))
            .mockResolvedValueOnce(response("pl", '"second"'));
        vi.stubGlobal("fetch", fetch);
        const { downloadCv } = await import("./downloadCv");
        const signal = new AbortController().signal;
        const first = await downloadCv("/api/cv/pl", signal);
        expect(await downloadCv("/api/cv/pl", signal)).toBe(first);
        expect(fetch.mock.calls[1][1].headers).toEqual({ "If-None-Match": '"first"' });
        const changed = await downloadCv("/api/cv/pl", signal);
        expect(changed.locale).toBe("pl");
        expect(changed.blob).not.toBe(first.blob);
    });
});
