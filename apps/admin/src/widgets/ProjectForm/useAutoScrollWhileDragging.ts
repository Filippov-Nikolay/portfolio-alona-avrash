"use client";

import { useEffect } from "react";

const EDGE_SIZE = 110;
const MAX_SPEED = 550;
const EASE_POWER = 2.6;
const RAMP_MS = 450;
const MAX_DT = 0.05;

export function useAutoScrollWhileDragging(
    active: boolean,
    pointerY: React.RefObject<number>,
    scrollBoundsRef?: React.RefObject<HTMLElement | null>
) {
    useEffect(() => {
        if (!active) return;

        let frame: number;
        let lastTime: number | null = null;
        let zoneEnteredAt: number | null = null;

        function tick(time: number) {
            const dt = lastTime === null ? 0 : Math.min((time - lastTime) / 1000, MAX_DT);
            lastTime = time;

            const viewportHeight = window.innerHeight;
            const y = pointerY.current;

            let strength = 0;
            if (y < EDGE_SIZE) {
                strength = -(((EDGE_SIZE - y) / EDGE_SIZE) ** EASE_POWER);
            } else if (y > viewportHeight - EDGE_SIZE) {
                strength = ((y - (viewportHeight - EDGE_SIZE)) / EDGE_SIZE) ** EASE_POWER;
            }

            if (strength === 0) {
                zoneEnteredAt = null;
            } else if (dt > 0) {
                if (zoneEnteredAt === null) zoneEnteredAt = time;
                const ramp = Math.min(1, (time - zoneEnteredAt) / RAMP_MS);
                const rawDelta = strength * ramp * MAX_SPEED * dt;

                const currentScrollY = window.scrollY;
                let targetScrollY = currentScrollY + rawDelta;

                const bounds = scrollBoundsRef?.current?.getBoundingClientRect();
                if (bounds) {
                    const sectionDocTop = currentScrollY + bounds.top;
                    const sectionDocBottom = currentScrollY + bounds.bottom;
                    const minScrollY = sectionDocTop;
                    const maxScrollY = sectionDocBottom - viewportHeight;
                    targetScrollY = Math.max(minScrollY, Math.min(maxScrollY, targetScrollY));
                }

                if (targetScrollY !== currentScrollY) {
                    window.scrollTo(0, targetScrollY);
                }
            }

            frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);

        return () => cancelAnimationFrame(frame);
    }, [active, pointerY, scrollBoundsRef]);
}
