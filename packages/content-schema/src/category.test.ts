import { describe, expect, it } from "vitest";
import { CategoryOptionSchema } from "./category";

describe("CategoryOptionSchema", () => {
    it("accepts a valid option", () => {
        expect(() =>
            CategoryOptionSchema.parse({ key: "branding", label: "Branding" })
        ).not.toThrow();
    });

    it("rejects an empty key", () => {
        expect(CategoryOptionSchema.safeParse({ key: "", label: "Branding" }).success).toBe(false);
    });

    it("rejects an empty label", () => {
        expect(CategoryOptionSchema.safeParse({ key: "branding", label: "" }).success).toBe(false);
    });

    it("rejects a missing field", () => {
        expect(CategoryOptionSchema.safeParse({ key: "branding" }).success).toBe(false);
    });
});
