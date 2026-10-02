"use client";

import { useLayoutEffect } from "react";
import { useMotionValue, type MotionValue } from "framer-motion";
import {
    cancelScrollIdleTask,
    retainScrollIdleTracking,
    scheduleWhenScrollIdle,
} from "@/shared/lib/motion/scrollIdle";

const HERO_RASTER_RELEASE_PROGRESS = 1;

export function useHeroLayerOpacity(
    heroOpacity: MotionValue<number>,
    cameraProgress: MotionValue<number>
) {
    const layerOpacity = useMotionValue(1);

    useLayoutEffect(() => {
        const release = retainScrollIdleTracking();
        const settle = () => {
            const hidden =
                heroOpacity.get() === 0 && cameraProgress.get() >= HERO_RASTER_RELEASE_PROGRESS;
            layerOpacity.set(hidden ? 0 : 1);
        };
        const sync = () => {
            if (heroOpacity.get() > 0 && layerOpacity.get() !== 1) {
                cancelScrollIdleTask(settle);
                layerOpacity.set(1);
                return;
            }
            scheduleWhenScrollIdle(settle);
        };
        const unsubscribeHero = heroOpacity.on("change", sync);
        const unsubscribeCamera = cameraProgress.on("change", sync);
        settle();

        return () => {
            unsubscribeHero();
            unsubscribeCamera();
            cancelScrollIdleTask(settle);
            release();
        };
    }, [cameraProgress, heroOpacity, layerOpacity]);

    return layerOpacity;
}
