"use client";

import { useLayoutEffect, useRef, type RefObject } from "react";
import { useMotionValue } from "framer-motion";
import {
    calculateServicesHeaderBandY,
    getServicesSceneScrollThresholds,
    isValidServicesHeaderBandGeometry,
    type ServicesHeaderBandGeometry,
} from "@/shared/lib/motion/servicesSceneGeometry";

const BAND_OVERLAP = 20;
const ENTRY_SENTINEL_ID = "services-header-band-entry";
const EXIT_SENTINEL_ID = "services-header-band-exit";

export function useServicesHeaderBandController(
    headerRef: RefObject<HTMLElement | null>,
    bandRef: RefObject<HTMLDivElement | null>
) {
    const bandY = useMotionValue(-120);
    const geometryRef = useRef<ServicesHeaderBandGeometry | null>(null);

    useLayoutEffect(() => {
        let disposed = false;
        let measureFrame = 0;
        let settleFrame = 0;
        let measureGeneration = 0;

        const syncBand = () => {
            const nextY = calculateServicesHeaderBandY(window.scrollY, geometryRef.current);
            bandY.set(nextY);

            if (
                process.env.NODE_ENV === "development" &&
                geometryRef.current &&
                window.scrollY >= geometryRef.current.entryEnd &&
                window.scrollY <= geometryRef.current.exitStart &&
                nextY !== 0
            ) {
                console.error("Services header band must be fully seated in the active scene.");
            }
        };

        const measureGeometry = (generation: number) => {
            const header = headerRef.current;
            const band = bandRef.current;
            const entrySentinel = document.getElementById(ENTRY_SENTINEL_ID);
            const exitSentinel = document.getElementById(EXIT_SENTINEL_ID);

            if (
                !header ||
                !band ||
                !entrySentinel ||
                !exitSentinel ||
                generation !== measureGeneration
            ) {
                return;
            }

            const scrollY = window.scrollY;
            const headerHeight = header.getBoundingClientRect().height;
            const entryTop = entrySentinel.getBoundingClientRect().top + scrollY;
            const exitTop = exitSentinel.getBoundingClientRect().top + scrollY;
            const thresholds = getServicesSceneScrollThresholds(
                entryTop,
                exitTop,
                window.innerHeight,
                headerHeight
            );
            const nextGeometry: ServicesHeaderBandGeometry = {
                ...thresholds,
                bandHeight: headerHeight + BAND_OVERLAP,
            };

            if (
                !isValidServicesHeaderBandGeometry(nextGeometry) ||
                generation !== measureGeneration
            ) {
                return;
            }

            geometryRef.current = nextGeometry;
            band.style.setProperty("--header-scene-height", `${nextGeometry.bandHeight}px`);
            syncBand();
        };

        const scheduleMeasure = () => {
            const generation = ++measureGeneration;
            cancelAnimationFrame(measureFrame);
            measureFrame = requestAnimationFrame(() => {
                measureFrame = 0;
                if (!disposed) measureGeometry(generation);
            });
        };

        const scheduleSettledMeasure = () => {
            cancelAnimationFrame(settleFrame);
            settleFrame = requestAnimationFrame(() => {
                settleFrame = requestAnimationFrame(() => {
                    settleFrame = 0;
                    scheduleMeasure();
                });
            });
        };

        const scheduleScrollSync = () => {
            syncBand();
        };

        const resizeObserver = new ResizeObserver(scheduleMeasure);
        const mutationObserver = new MutationObserver(scheduleSettledMeasure);
        const observeLayout = () => {
            const header = headerRef.current;
            const pageScene = document.querySelector("main");
            const entrySentinel = document.getElementById(ENTRY_SENTINEL_ID);
            const exitSentinel = document.getElementById(EXIT_SENTINEL_ID);

            if (header) resizeObserver.observe(header);
            if (pageScene) resizeObserver.observe(pageScene);
            if (entrySentinel) resizeObserver.observe(entrySentinel);
            if (exitSentinel) resizeObserver.observe(exitSentinel);
        };

        observeLayout();
        scheduleMeasure();
        scheduleSettledMeasure();
        mutationObserver.observe(document.body, { childList: true, subtree: true });
        void document.fonts?.ready.then(() => {
            if (!disposed) scheduleSettledMeasure();
        });

        window.addEventListener("scroll", scheduleScrollSync, { passive: true });
        window.addEventListener("resize", scheduleMeasure);
        window.addEventListener("load", scheduleSettledMeasure);
        window.addEventListener("pageshow", scheduleSettledMeasure);

        return () => {
            disposed = true;
            cancelAnimationFrame(measureFrame);
            cancelAnimationFrame(settleFrame);
            resizeObserver.disconnect();
            mutationObserver.disconnect();
            window.removeEventListener("scroll", scheduleScrollSync);
            window.removeEventListener("resize", scheduleMeasure);
            window.removeEventListener("load", scheduleSettledMeasure);
            window.removeEventListener("pageshow", scheduleSettledMeasure);
        };
    }, [bandRef, bandY, headerRef]);

    return bandY;
}
