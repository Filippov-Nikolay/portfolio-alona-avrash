"use client";

import { useEffect, useRef } from "react";

const EDGE_SIZE = 96;
const MAX_SPEED = 18;

export function useAutoScrollWhileDragging(active: boolean) {
    const pointerY = useRef(0);

    useEffect(() => {
        if (!active) return;

        function handlePointerMove(e: PointerEvent) {
            pointerY.current = e.clientY;
        }
        window.addEventListener("pointermove", handlePointerMove);

        let frame: number;
        function tick() {
            const viewportHeight = window.innerHeight;
            const y = pointerY.current;

            let delta = 0;
            if (y < EDGE_SIZE) {
                delta = -MAX_SPEED * (1 - y / EDGE_SIZE);
            } else if (y > viewportHeight - EDGE_SIZE) {
                delta = MAX_SPEED * (1 - (viewportHeight - y) / EDGE_SIZE);
            }

            if (delta !== 0) {
                window.scrollBy(0, delta);
            }

            frame = requestAnimationFrame(tick);
        }
        frame = requestAnimationFrame(tick);

        return () => {
            window.removeEventListener("pointermove", handlePointerMove);
            cancelAnimationFrame(frame);
        };
    }, [active]);
}
