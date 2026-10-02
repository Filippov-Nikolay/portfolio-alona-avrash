import { describe, expect, it } from "vitest";
import { createReelTransition, retargetReel, sampleReel } from "./reelTransition";
// Samples from the browser's original CSS transition, including an interrupted reversal.
import reference from "./reelTransition.fixture.json";

describe("digit reel animation without a composited CSS transition", () => {
    it("matches the original 220ms CSS cubic-bezier", () => {
        const reel = createReelTransition();
        retargetReel(reel, 9, 0, false);
        for (const { time, value } of reference.first)
            expect(sampleReel(reel, time)).toBeCloseTo(value, 4);
        expect(sampleReel(reel, 500)).toBe(9);
    });

    it("matches CSS shortening when the scroll reverses an unfinished digit", () => {
        const reel = createReelTransition();
        retargetReel(reel, 9, 0, false);
        retargetReel(reel, 0, 55, false);
        expect(reel.duration).toBeCloseTo(reference.reverseDuration, 3);
        for (const { time, value } of reference.reverse)
            expect(sampleReel(reel, 55 + time)).toBeCloseTo(value, 4);
    });

    it("retargets from the current visible digit without restarting an unchanged destination", () => {
        const reel = createReelTransition();
        retargetReel(reel, 9, 0, false);
        const visible = sampleReel(reel, 80);
        retargetReel(reel, 4, 80, false);
        expect(sampleReel(reel, 80)).toBe(visible);
        expect(reel.duration).toBe(220);
        retargetReel(reel, 4, 100, false);
        expect(reel.start).toBe(80);
        expect(sampleReel(reel, 300)).toBe(4);
    });

    it("commits exact endpoints for continuous and reduced-motion digits", () => {
        const reel = createReelTransition();
        retargetReel(reel, 9, 0, false);
        retargetReel(reel, 0, 60, true);
        expect(sampleReel(reel, 60)).toBe(0);
        expect(reel.duration).toBe(0);
        retargetReel(reel, 3.1415, 70, true);
        expect(sampleReel(reel, 70)).toBe(3.1415);
    });
});
