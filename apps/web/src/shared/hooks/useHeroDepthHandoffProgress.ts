"use client";

import { useTransform, type MotionValue } from "framer-motion";
import { useHeroDepthHandoffRange } from "./useHeroDepthHandoffRange";

const PROGRESS_SNAP_START = 0.001;
const PROGRESS_SNAP_END = 0.999;

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

export function useHeroDepthHandoffProgress(scrollY: MotionValue<number>) {
    const { entry, start, end } = useHeroDepthHandoffRange();

    const rawProgress = useTransform(scrollY, [start, end], [0, 1]);
    const progress = useTransform(() => {
        const value = clamp01(rawProgress.get());

        if (value <= PROGRESS_SNAP_START) {
            return 0;
        }

        if (value >= PROGRESS_SNAP_END) {
            return 1;
        }

        return value;
    });

    return {
        entry,
        start,
        end,
        rawProgress,
        progress,
    };
}
