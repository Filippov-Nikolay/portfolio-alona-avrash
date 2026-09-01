"use client";

import { useLayoutEffect, useState } from "react";
import { useScroll, useTransform } from "framer-motion";

interface StatsSelectedRange {
    start: number;
    end: number;
    runway: number;
}

const DEFAULT_RANGE: StatsSelectedRange = {
    start: 0,
    end: 1,
    runway: 1,
};

export function useStatsSelectedProgress(
    stageId = "hero-transition-track",
    cameraTrackId = "stats-camera-track"
) {
    const { scrollY } = useScroll();
    const [range, setRange] = useState(DEFAULT_RANGE);

    useLayoutEffect(() => {
        const stage = document.getElementById(stageId);
        const cameraTrack = document.getElementById(cameraTrackId);

        if (!stage || !cameraTrack) {
            return;
        }

        const measure = () => {
            const stageRect = stage.getBoundingClientRect();
            const cameraTrackRect = cameraTrack.getBoundingClientRect();
            const stageTop = stageRect.top + window.scrollY;
            const nextStart = stageTop + Math.max(cameraTrackRect.height - window.innerHeight, 1);
            const nextEnd = stageTop + Math.max(stageRect.height - window.innerHeight, 1);
            const nextRange = Math.max(nextEnd - nextStart, 1);

            setRange((prev) =>
                Math.abs(prev.start - nextStart) < 0.5 && Math.abs(prev.end - nextEnd) < 0.5
                    ? prev
                    : { start: nextStart, end: nextEnd, runway: nextRange }
            );
        };

        const resizeObserver =
            typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
        const frame = requestAnimationFrame(measure);

        resizeObserver?.observe(stage);
        resizeObserver?.observe(cameraTrack);
        window.addEventListener("resize", measure);

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [cameraTrackId, stageId]);

    const rawProgress = useTransform(scrollY, [range.start, range.end], [0, 1], {
        clamp: false,
    });
    const progress = useTransform(rawProgress, [0, 1], [0, 1], { clamp: true });

    return { ...range, rawProgress, progress };
}
