"use client";

import { useLayoutEffect, type RefObject } from "react";
import { cancelFrame, frame, useMotionValue } from "framer-motion";
import { createViewportResizeGuard } from "@/shared/lib/motion/mobileViewport";

/** The scene's layout is fixed while scrolling; measure it only on layout changes. */
export function useHeroScroll(
    trackRef: RefObject<HTMLDivElement | null>,
    viewportRef: RefObject<HTMLDivElement | null>
) {
    const scrollY = useMotionValue(0);
    const scrollYProgress = useMotionValue(0);

    useLayoutEffect(() => {
        const track = trackRef.current;
        const viewport = viewportRef.current;
        if (!track || !viewport) return;

        let disposed = false;
        let needsMeasure = true;
        let start = 0;
        let runway = 1;
        let y = window.scrollY;
        const shouldMeasureResize = createViewportResizeGuard();

        const update = () => {
            if (disposed) return;
            if (needsMeasure) {
                const bounds = track.getBoundingClientRect();
                start = bounds.top + y;
                // Match the 100svh sticky scene used by the Stats camera. Safari's
                // address bar must not change the runway halfway through a gesture.
                runway = Math.max(bounds.height - viewport.getBoundingClientRect().height, 1);
                needsMeasure = false;
            }
            scrollY.set(y);
            scrollYProgress.set(Math.max(0, Math.min(1, (y - start) / runway)));
        };
        // Motion's read/update/render phases share one frame. Do not insert an
        // independent rAF loop between the scroll input, camera and counters.
        const scheduleUpdate = () => frame.read(update);
        const onScroll = () => {
            y = window.scrollY;
            scheduleUpdate();
        };
        const measure = () => {
            if (disposed) return;
            y = window.scrollY;
            needsMeasure = true;
            scheduleUpdate();
        };
        const onResize = () => {
            if (shouldMeasureResize()) measure();
        };
        const observer = new ResizeObserver(measure);
        observer.observe(track);
        observer.observe(viewport);
        update();
        void document.fonts.ready.then(measure);
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onResize);
        window.addEventListener("pageshow", measure);

        return () => {
            disposed = true;
            cancelFrame(update);
            observer.disconnect();
            window.removeEventListener("scroll", onScroll);
            window.removeEventListener("resize", onResize);
            window.removeEventListener("pageshow", measure);
        };
    }, [scrollY, scrollYProgress, trackRef, viewportRef]);

    return { scrollY, scrollYProgress };
}
