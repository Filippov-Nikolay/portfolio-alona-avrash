"use client";

import { useEffect, useRef } from "react";

export function usePointerYTracker() {
    const pointerY = useRef(0);

    useEffect(() => {
        function handlePointerMove(e: PointerEvent) {
            pointerY.current = e.clientY;
        }
        window.addEventListener("pointermove", handlePointerMove);
        return () => window.removeEventListener("pointermove", handlePointerMove);
    }, []);

    return pointerY;
}
