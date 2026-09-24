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
    { compact, reduced, integratedReveal }: StatsCameraConfig
) {
    useLayoutEffect(() => {
        const element = ref.current;
        if (!element) return;
        const config = { compact, reduced, integratedReveal };
        const originalTransform = element.style.transform;
        const originalOpacity = element.style.opacity;
        const originalOrigin = element.style.transformOrigin;
        const anchor = element.parentElement!;
        const stage = element.closest<HTMLElement>("[data-stats-camera-stage]")!;
        let disposed = false;
        let origin = "";
        const applyOrigin = () => {
            if (element.style.transformOrigin !== origin) element.style.transformOrigin = origin;
        };
        const measureOrigin = () => {
            if (disposed) return;
            // Measure the untransformed slot, never the animated camera. The
            // origin stays at the old full-screen plane's center as the grid shrinks.
            const slot = anchor.getBoundingClientRect();
            const viewport = stage.getBoundingClientRect();
            origin = `${viewport.left + viewport.width / 2 - slot.left}px ${viewport.top + viewport.height / 2 - slot.top}px`;
            frame.render(applyOrigin);
        };
        const scheduleOrigin = () => frame.read(measureOrigin);
        measureOrigin();
        applyOrigin();
        const observer = new ResizeObserver(scheduleOrigin);
        observer.observe(anchor);
        observer.observe(stage);
        void document.fonts.ready.then(() => {
            if (!disposed) scheduleOrigin();
        });
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
            disposed = true;
            observer.disconnect();
            cancelFrame(measureOrigin);
            cancelFrame(applyOrigin);
            unsubscribe();
            cancelFrame(seek);
            animation?.cancel();
            element.style.transformOrigin = originalOrigin;
            if (!animation) {
                element.style.transform = originalTransform;
                element.style.opacity = originalOpacity;
            }
        };
    }, [compact, progress, reduced, integratedReveal, ref]);
}
