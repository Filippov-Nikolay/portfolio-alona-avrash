import { describe, expect, it } from "vitest";
import { DEFAULT_LOCALE } from "@/i18n/locales";
import { resolveLocaleContent } from "./resolveLocaleContent";

describe("resolveLocaleContent", () => {
    it("returns the exact locale's content when present", () => {
        const i18n = { [DEFAULT_LOCALE]: { title: "Hello" }, pl: { title: "Czesc" } };
        expect(resolveLocaleContent(i18n, "pl")).toEqual({ title: "Czesc" });
    });

    it("falls back to the default locale when the requested one is missing", () => {
        const i18n = { [DEFAULT_LOCALE]: { title: "Hello" } };
        expect(resolveLocaleContent(i18n, "de")).toEqual({ title: "Hello" });
    });

    it("returns undefined when neither the locale nor the default is present", () => {
        const i18n = { fr: { title: "Bonjour" } };
        expect(resolveLocaleContent(i18n, "de")).toBeUndefined();
    });
});
