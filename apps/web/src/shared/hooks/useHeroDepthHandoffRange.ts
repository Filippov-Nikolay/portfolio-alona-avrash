"use client";

import { useLayoutEffect, useState } from "react";
import { HERO_DEPTH_TRANSITION_START } from "@/shared/config/heroDepthHandoff";

interface HeroDepthHandoffRange {
    entry: number;
    start: number;
    end: number;
}

const DEFAULT_RANGE: HeroDepthHandoffRange = {
    entry: 0,
    start: 0,
    end: 1,
};

interface UseHeroDepthHandoffRangeOptions {
    stageId?: string;
    heroTrackId?: string;
    cameraTrackId?: string;
}

export function useHeroDepthHandoffRange({
    stageId = "hero-transition-track",
    heroTrackId = "hero-scroll-track",
    cameraTrackId = "stats-camera-track",
}: UseHeroDepthHandoffRangeOptions = {}) {
    const [range, setRange] = useState(DEFAULT_RANGE);

    useLayoutEffect(() => {
        const stageRoot = document.getElementById(stageId);
        const heroTrack = document.getElementById(heroTrackId);
        const cameraTrack = document.getElementById(cameraTrackId);

        if (!stageRoot || !heroTrack || !cameraTrack) {
            return;
        }

        const measure = () => {
            const stageRect = stageRoot.getBoundingClientRect();
            const heroTrackRect = heroTrack.getBoundingClientRect();
            const cameraTrackRect = cameraTrack.getBoundingClientRect();
            const stageTop = stageRect.top + window.scrollY;
            const heroScrollableRange = Math.max(heroTrackRect.height - window.innerHeight, 1);
            const cameraScrollableRange = Math.max(cameraTrackRect.height - window.innerHeight, 1);
            const nextEntry = stageTop + heroScrollableRange;
            const nextStart = stageTop + heroScrollableRange * HERO_DEPTH_TRANSITION_START;
            const nextEnd = stageTop + cameraScrollableRange;

            setRange((prev) =>
                Math.abs(prev.entry - nextEntry) < 0.5 &&
                Math.abs(prev.start - nextStart) < 0.5 &&
                Math.abs(prev.end - nextEnd) < 0.5
                    ? prev
                    : { entry: nextEntry, start: nextStart, end: nextEnd }
            );
        };

        const resizeObserver =
            typeof ResizeObserver === "undefined"
                ? null
                : new ResizeObserver(() => {
                      measure();
                  });

        const rafId = requestAnimationFrame(measure);

        resizeObserver?.observe(stageRoot);
        resizeObserver?.observe(heroTrack);
        resizeObserver?.observe(cameraTrack);
        window.addEventListener("resize", measure);

        return () => {
            cancelAnimationFrame(rafId);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [cameraTrackId, heroTrackId, stageId]);

    return range;
}
