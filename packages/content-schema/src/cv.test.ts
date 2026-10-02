import { describe, expect, it } from "vitest";
import { CvContentSchema, resolveCv, type CvContent, type CvDocument } from "./cv";

function cvDocument(id: string): CvDocument {
    return {
        id,
        fileName: `${id.slice(0, 2)}.pdf`,
        size: 10,
        updatedAt: "2026-09-29T12:00:00.000Z",
    };
}

const en = cvDocument("11111111-1111-4111-8111-111111111111");
const pl = cvDocument("22222222-2222-4222-8222-222222222222");
const de = cvDocument("33333333-3333-4333-8333-333333333333");

const resolved = (files: CvContent["files"], locale: string) =>
    resolveCv({ files }, locale)?.locale ?? null;

describe("resolveCv", () => {
    it("prefers the CV in the visitor's language", () => {
        expect(resolved({ en, pl }, "en")).toBe("en");
        expect(resolved({ en, pl }, "pl")).toBe("pl");
        expect(resolved({ en, pl, de }, "de")).toBe("de");
    });

    it("falls back to the only uploaded CV, whatever its language", () => {
        expect(resolved({ en }, "pl")).toBe("en");
        expect(resolved({ pl }, "en")).toBe("pl");
    });

    it("falls back to the default language when several CVs miss the locale", () => {
        expect(resolved({ en, pl }, "de")).toBe("en");
        expect(resolved({ pl, de }, "fr")).toBe("pl");
    });

    it("serves every language from one upload and prefers English among several", () => {
        const ru = de;
        for (const locale of ["en", "pl", "ru"]) {
            expect(resolved({ pl }, locale)).toBe("pl");
            expect(resolved({ en }, locale)).toBe("en");
        }
        expect(resolved({ en, pl }, "ru")).toBe("en");
        expect(resolved({ en, pl, ru }, "ru")).toBe("ru");
    });

    it("returns nothing when no CV is uploaded", () => {
        expect(resolveCv({ files: {} }, "en")).toBeNull();
    });
});

describe("CvContentSchema", () => {
    it("reads the single shared CV saved before per-language CVs as the default one", () => {
        expect(CvContentSchema.parse(null)).toEqual({ files: {} });
        expect(CvContentSchema.parse(en)).toEqual({ files: { en } });
    });

    it("rejects unsafe language keys and malformed documents", () => {
        expect(() => CvContentSchema.parse({ files: { "../en": en } })).toThrow();
        expect(() =>
            CvContentSchema.parse({ files: { en: { ...en, id: "../secret" } } })
        ).toThrow();
    });
});
