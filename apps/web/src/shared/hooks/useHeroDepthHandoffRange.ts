"use client";

import { useLayoutEffect, useState } from "react";
import { HERO_DEPTH_TRANSITION_START } from "@/shared/config/heroDepthHandoff";
import { createViewportResizeGuard } from "@/shared/lib/motion";

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
    viewportId?: string;
}

export function useHeroDepthHandoffRange({
    stageId = "hero-transition-track",
    heroTrackId = "hero-scroll-track",
    cameraTrackId = "stats-camera-track",
    viewportId = "hero-sticky-stage",
}: UseHeroDepthHandoffRangeOptions = {}) {
    const [range, setRange] = useState(DEFAULT_RANGE);

    useLayoutEffect(() => {
        const stageRoot = document.getElementById(stageId);
        const heroTrack = document.getElementById(heroTrackId);
        const cameraTrack = document.getElementById(cameraTrackId);
        const viewport = document.getElementById(viewportId);

        if (!stageRoot || !heroTrack || !cameraTrack || !viewport) {
            return;
        }

        let measureFrame = 0;
        const shouldMeasureViewportResize = createViewportResizeGuard();

        const measure = () => {
            measureFrame = 0;
            const stageRect = stageRoot.getBoundingClientRect();
            const heroTrackRect = heroTrack.getBoundingClientRect();
            const cameraTrackRect = cameraTrack.getBoundingClientRect();
            const viewportHeight = viewport.getBoundingClientRect().height;
            const stageTop = stageRect.top + window.scrollY;
            const heroScrollableRange = Math.max(heroTrackRect.height - viewportHeight, 1);
            const cameraScrollableRange = Math.max(cameraTrackRect.height - viewportHeight, 1);
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

        const scheduleMeasure = () => {
            if (measureFrame) return;
            measureFrame = requestAnimationFrame(measure);
        };

        const handleResize = () => {
            if (shouldMeasureViewportResize()) scheduleMeasure();
        };

        const resizeObserver =
            typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);

        scheduleMeasure();

        resizeObserver?.observe(stageRoot);
        resizeObserver?.observe(heroTrack);
        resizeObserver?.observe(cameraTrack);
        resizeObserver?.observe(viewport);
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(measureFrame);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", handleResize);
        };
    }, [cameraTrackId, heroTrackId, stageId, viewportId]);

    return range;
}
