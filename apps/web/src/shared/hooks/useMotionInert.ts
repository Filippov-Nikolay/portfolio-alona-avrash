"use client";

import { useCallback, useLayoutEffect, type RefObject } from "react";
import { cancelFrame, frame, useMotionValueEvent, type MotionValue } from "framer-motion";

/** Exclude transparent layers from interaction without toggling their rendering visibility. */
export function useMotionInert(
    ref: RefObject<HTMLElement | null>,
    inert: MotionValue<boolean>,
    pointerEvents: MotionValue<"auto" | "none">
) {
    const commit = useCallback(() => {
        const element = ref.current;
        if (!element) return;
        const nextInert = inert.get();
        const nextPointer = pointerEvents.get();
        if (element.inert !== nextInert) element.toggleAttribute("inert", nextInert);
        if (element.style.pointerEvents !== nextPointer) element.style.pointerEvents = nextPointer;
    }, [ref, inert, pointerEvents]);
    const schedule = useCallback(() => frame.render(commit), [commit]);
    useMotionValueEvent(inert, "change", schedule);
    useMotionValueEvent(pointerEvents, "change", schedule);

    useLayoutEffect(() => {
        // A restored scroll position may already be past the initial SSR state.
        commit();
        return () => cancelFrame(commit);
    }, [commit]);
}
