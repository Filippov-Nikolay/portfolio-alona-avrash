import { describe, expect, it } from "vitest";
import { buildLinePath } from "./buildLinePath";

describe("buildLinePath", () => {
    it("returns an empty path for no points", () => {
        expect(buildLinePath([], 100, 50)).toEqual({ d: "", maxValue: 1 });
    });

    it("draws a flat horizontal line for a single point", () => {
        const { d } = buildLinePath([{ date: "2026-01-01", value: 5 }], 100, 50);
        expect(d).toBe("M 0 0 L 100 0");
    });

    it("maps the peak value to y = 0 (top of the chart)", () => {
        const { d } = buildLinePath(
            [
                { date: "2026-01-01", value: 1 },
                { date: "2026-01-02", value: 10 },
            ],
            100,
            50
        );
        expect(d).toContain("L 100.00 0.00");
    });

    it("maps a zero value to the bottom of the chart", () => {
        const { d } = buildLinePath(
            [
                { date: "2026-01-01", value: 0 },
                { date: "2026-01-02", value: 10 },
            ],
            100,
            50
        );
        expect(d.startsWith("M 0.00 50.00")).toBe(true);
    });

    it("does not divide by zero when every value is 0", () => {
        const { d, maxValue } = buildLinePath(
            [
                { date: "2026-01-01", value: 0 },
                { date: "2026-01-02", value: 0 },
            ],
            100,
            50
        );
        expect(maxValue).toBe(1);
        expect(d).not.toContain("NaN");
    });

    it("reports the real max when it exceeds 1", () => {
        const { maxValue } = buildLinePath([{ date: "2026-01-01", value: 428 }], 100, 50);
        expect(maxValue).toBe(428);
    });
});
