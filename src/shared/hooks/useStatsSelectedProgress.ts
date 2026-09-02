"use client";

import { useLayoutEffect, useState } from "react";
import { useScroll, useTransform } from "framer-motion";

interface StatsSelectedRange {
    start: number;
    end: number;
    focusEnd: number;
    handoffEnd: number;
    runway: number;
    focusRunway: number;
    handoffRunway: number;
}

const DEFAULT_RANGE: StatsSelectedRange = {
    start: 0,
    end: 1,
    focusEnd: 1,
    handoffEnd: 1,
    runway: 1,
    focusRunway: 1,
    handoffRunway: 1,
};

export function useStatsSelectedProgress(
    stageId = "hero-transition-track",
    cameraTrackId = "stats-camera-track",
    selectedMotionTrackId = "selected-motion-track",
    selectedFocusTrackId = "selected-focus-track"
) {
    const { scrollY } = useScroll();
    const [range, setRange] = useState(DEFAULT_RANGE);

    useLayoutEffect(() => {
        const stage = document.getElementById(stageId);
        const cameraTrack = document.getElementById(cameraTrackId);
        const selectedMotionTrack = document.getElementById(selectedMotionTrackId);
        const selectedFocusTrack = document.getElementById(selectedFocusTrackId);

        if (!stage || !cameraTrack || !selectedMotionTrack || !selectedFocusTrack) {
            return;
        }

        const measure = () => {
            const stageRect = stage.getBoundingClientRect();
            const cameraTrackRect = cameraTrack.getBoundingClientRect();
            const selectedMotionTrackRect = selectedMotionTrack.getBoundingClientRect();
            const selectedFocusTrackRect = selectedFocusTrack.getBoundingClientRect();
            const stageTop = stageRect.top + window.scrollY;
            const nextStart = stageTop + Math.max(cameraTrackRect.height - window.innerHeight, 1);
            const nextEnd =
                stageTop + Math.max(selectedMotionTrackRect.height - window.innerHeight, 1);
            const nextFocusEnd =
                stageTop + Math.max(selectedFocusTrackRect.height - window.innerHeight, 1);
            const nextHandoffEnd = stageTop + Math.max(stageRect.height - window.innerHeight, 1);
            const nextRange = Math.max(nextEnd - nextStart, 1);
            const nextFocusRunway = Math.max(nextFocusEnd - nextEnd, 1);
            const nextHandoffRunway = Math.max(nextHandoffEnd - nextFocusEnd, 1);

            setRange((prev) =>
                Math.abs(prev.start - nextStart) < 0.5 &&
                Math.abs(prev.end - nextEnd) < 0.5 &&
                Math.abs(prev.focusEnd - nextFocusEnd) < 0.5 &&
                Math.abs(prev.handoffEnd - nextHandoffEnd) < 0.5
                    ? prev
                    : {
                          start: nextStart,
                          end: nextEnd,
                          focusEnd: nextFocusEnd,
                          handoffEnd: nextHandoffEnd,
                          runway: nextRange,
                          focusRunway: nextFocusRunway,
                          handoffRunway: nextHandoffRunway,
                      }
            );
        };

        const resizeObserver =
            typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
        const frame = requestAnimationFrame(measure);

        resizeObserver?.observe(stage);
        resizeObserver?.observe(cameraTrack);
        resizeObserver?.observe(selectedMotionTrack);
        resizeObserver?.observe(selectedFocusTrack);
        window.addEventListener("resize", measure);

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [cameraTrackId, selectedFocusTrackId, selectedMotionTrackId, stageId]);

    const rawProgress = useTransform(scrollY, [range.start, range.end], [0, 1], {
        clamp: false,
    });
    const progress = useTransform(rawProgress, [0, 1], [0, 1], { clamp: true });
    const focusProgress = useTransform(scrollY, [range.end, range.focusEnd], [0, 1], {
        clamp: true,
    });
    const handoffProgress = useTransform(scrollY, [range.focusEnd, range.handoffEnd], [0, 1], {
        clamp: true,
    });

    return { ...range, rawProgress, progress, focusProgress, handoffProgress };
}
