import { describe, expect, it } from "vitest";
import { parseDaysParam } from "./period";

describe("parseDaysParam", () => {
    it("passes through each allowed preset", () => {
        expect(parseDaysParam("7")).toBe(7);
        expect(parseDaysParam("30")).toBe(30);
        expect(parseDaysParam("90")).toBe(90);
        expect(parseDaysParam("365")).toBe(365);
    });

    it("defaults to 30 when missing", () => {
        expect(parseDaysParam(undefined)).toBe(30);
    });

    it("defaults to 30 for a value outside the preset list", () => {
        expect(parseDaysParam("14")).toBe(30);
        expect(parseDaysParam("10000")).toBe(30);
    });

    it("defaults to 30 for non-numeric input", () => {
        expect(parseDaysParam("abc")).toBe(30);
    });

    it("takes the first value when given an array (repeated ?days=)", () => {
        expect(parseDaysParam(["90", "7"])).toBe(90);
    });
});
