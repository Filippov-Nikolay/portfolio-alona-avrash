"use client";

import { useLayoutEffect, type RefObject } from "react";
import { cancelFrame, frame, type MotionValue } from "framer-motion";
import {
    STATS_CAMERA_DURATION,
    statsCameraKeyframes,
    statsCameraPose,
    type StatsCameraConfig,
} from "./statsCamera";

export function useStatsCamera(
    ref: RefObject<HTMLDivElement | null>,
    progress: MotionValue<number>,
    { compact, reduced }: StatsCameraConfig
) {
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        const config = { compact, reduced };
        const originalTransform = element.style.transform;
        const originalOpacity = element.style.opacity;
        const animation =
            typeof element.animate === "function"
                ? element.animate(statsCameraKeyframes(config), {
                      duration: STATS_CAMERA_DURATION,
                      fill: "both",
                      easing: "linear",
                  })
                : null;
        animation?.pause();
        let previous = Number.NaN;

        const seek = () => {
            const latest = Math.max(0, Math.min(1, progress.get()));
            if (latest === previous) return;
            previous = latest;
            if (animation) {
                // Keep one effect for the whole scroll, including reversals.
                // Give the browser the complete scale range once instead of
                // replacing the layer's inline transform on every frame.
                animation.currentTime = latest * STATS_CAMERA_DURATION;
            } else {
                const pose = statsCameraPose(latest, config);
                element.style.transform = pose.transform;
                element.style.opacity = String(pose.opacity);
            }
        };
        const schedule = () => frame.render(seek);
        const unsubscribe = progress.on("change", schedule);
        seek();

        return () => {
            unsubscribe();
            cancelFrame(seek);
            animation?.cancel();
            if (!animation) {
                element.style.transform = originalTransform;
                element.style.opacity = originalOpacity;
            }
        };
    }, [compact, progress, reduced, ref]);
}
