import { describe, expect, it } from "vitest";
import { slugifyProjectName } from "./slug";

describe("slugifyProjectName", () => {
    it("lowercases and hyphenates spaces", () => {
        expect(slugifyProjectName("Cafe Rebrand")).toBe("cafe-rebrand");
    });

    it("strips diacritics instead of dropping the letter", () => {
        expect(slugifyProjectName("Café Résumé")).toBe("cafe-resume");
    });

    it("collapses runs of punctuation into a single hyphen", () => {
        expect(slugifyProjectName("Salt & Pepper Co.")).toBe("salt-pepper-co");
    });

    it("trims leading and trailing hyphens", () => {
        expect(slugifyProjectName("  --Wrapped--  ")).toBe("wrapped");
    });

    it("leaves an already-clean slug unchanged", () => {
        expect(slugifyProjectName("already-a-slug-2")).toBe("already-a-slug-2");
    });
});
