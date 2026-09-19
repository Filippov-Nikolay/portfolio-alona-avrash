import { describe, expect, it } from "vitest";
import { slugify } from "./slugify";

describe("slugify", () => {
    it("lowercases and hyphenates spaces", () => {
        expect(slugify("Brand Identity")).toBe("brand-identity");
    });

    it("strips diacritics instead of dropping the letter", () => {
        expect(slugify("Café Résumé")).toBe("cafe-resume");
    });

    it("collapses runs of non-alphanumeric characters into a single hyphen", () => {
        expect(slugify("Hello,  World!! --- Again")).toBe("hello-world-again");
    });

    it("trims leading and trailing hyphens", () => {
        expect(slugify("  --Wrapped--  ")).toBe("wrapped");
    });

    it("returns an empty string for input with no letters or digits", () => {
        expect(slugify("!!! ---")).toBe("");
    });

    it("leaves an already-clean slug unchanged", () => {
        expect(slugify("already-a-slug-2")).toBe("already-a-slug-2");
    });
});
