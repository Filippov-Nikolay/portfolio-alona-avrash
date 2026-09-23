import { describe, expect, it } from "vitest";
import { digitWheelScrollPosition } from "./parseStatValue";

describe("digitWheelScrollPosition", () => {
    it("keeps the last reel continuously tied to scroll progress", () => {
        expect(digitWheelScrollPosition(24.5, 58, 0, true)).toBeCloseTo(4.5);
    });

    it("smoothly completes a discrete carry before its boundary", () => {
        const position = digitWheelScrollPosition(49.92, 58, 1, false);

        expect(position).toBeGreaterThan(4);
        expect(position).toBeLessThan(5);
        expect(digitWheelScrollPosition(50, 58, 1, false)).toBe(5);
    });

    it("does not start a carry beyond the final target digit", () => {
        expect(digitWheelScrollPosition(57.99, 58, 1, false)).toBe(5);
        expect(digitWheelScrollPosition(58, 58, 1, false)).toBe(5);
    });

    it("uses the duplicate zero to keep wrapped carries visually continuous", () => {
        const position = digitWheelScrollPosition(899, 900, 1, false);

        expect(position).toBeGreaterThan(9);
        expect(position).toBeLessThan(10);
        expect(digitWheelScrollPosition(900, 900, 1, false)).toBe(0);
    });
});
