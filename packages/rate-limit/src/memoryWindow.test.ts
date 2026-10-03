import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMemoryWindow } from "./memoryWindow";

beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
});

afterEach(() => {
    vi.useRealTimers();
});

describe("createMemoryWindow", () => {
    it("allows max hits per key and blocks the next one", () => {
        const isLimited = createMemoryWindow(3, 1000);
        expect([isLimited("a"), isLimited("a"), isLimited("a"), isLimited("a")]).toEqual([
            false,
            false,
            false,
            true,
        ]);
    });

    it("counts every key separately", () => {
        const isLimited = createMemoryWindow(1, 1000);
        expect(isLimited("a")).toBe(false);
        expect(isLimited("b")).toBe(false);
        expect(isLimited("a")).toBe(true);
    });

    it("slides: each hit expires one window after it was made", () => {
        const isLimited = createMemoryWindow(2, 1000);
        isLimited("a");
        vi.setSystemTime(600);
        isLimited("a");
        expect(isLimited("a")).toBe(true);

        vi.setSystemTime(1000);
        expect(isLimited("a")).toBe(false);
        expect(isLimited("a")).toBe(true);
    });

    it("does not extend the window with blocked hits", () => {
        const isLimited = createMemoryWindow(1, 1000);
        isLimited("a");
        vi.setSystemTime(900);
        expect(isLimited("a")).toBe(true);
        vi.setSystemTime(1000);
        expect(isLimited("a")).toBe(false);
    });
});
