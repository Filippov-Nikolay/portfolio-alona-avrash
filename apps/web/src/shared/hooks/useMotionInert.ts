"use client";

import { useLayoutEffect, type RefObject } from "react";
import { useMotionValueEvent, type MotionValue } from "framer-motion";

/** Exclude transparent layers from interaction without toggling their rendering visibility. */
export function useMotionInert(ref: RefObject<HTMLElement | null>, inert: MotionValue<boolean>) {
    useMotionValueEvent(inert, "change", (value) => {
        ref.current?.toggleAttribute("inert", value);
    });

    useLayoutEffect(() => {
        // A restored scroll position may already be past the initial SSR state.
        ref.current?.toggleAttribute("inert", inert.get());
    }, [inert, ref]);
}
