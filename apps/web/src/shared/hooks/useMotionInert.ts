"use client";

import { useCallback, useLayoutEffect, type RefObject } from "react";
import { cancelFrame, frame, useMotionValueEvent, type MotionValue } from "framer-motion";

const SCROLL_IDLE_MS = 150;
const SCROLL_IDLE_FRAMES = 2;

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

    const schedule = useCallback(() => {
        if (isScrollIdle()) {
            frame.render(commit);
        } else {
            pendingCommits.add(commit);
            frame.postRender(flushWhenIdle);
        }
    }, [commit]);
    useMotionValueEvent(inert, "change", schedule);
    useMotionValueEvent(pointerEvents, "change", schedule);

    useLayoutEffect(() => {
        const detach = attachScrollActivity();
        // A restored scroll position may already be past the initial SSR state.
        commit();
        return () => {
            pendingCommits.delete(commit);
            cancelFrame(commit);
            detach();
        };
    }, [commit]);
}

let consumers = 0;
let lastScrollTime = Number.NEGATIVE_INFINITY;
let quietFrames = SCROLL_IDLE_FRAMES;
const pendingCommits = new Set<() => void>();

function isScrollIdle() {
    return (
        quietFrames >= SCROLL_IDLE_FRAMES && performance.now() - lastScrollTime >= SCROLL_IDLE_MS
    );
}

function flushWhenIdle() {
    if (pendingCommits.size === 0) return;
    if (!isScrollIdle()) {
        quietFrames++;
        frame.postRender(flushWhenIdle);
        return;
    }
    pendingCommits.forEach((commit) => frame.render(commit));
    pendingCommits.clear();
}

function handleScroll() {
    lastScrollTime = performance.now();
    quietFrames = 0;
}

function attachScrollActivity() {
    consumers++;
    if (consumers === 1) window.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
        consumers--;
        if (consumers > 0) return;
        window.removeEventListener("scroll", handleScroll);
        cancelFrame(flushWhenIdle);
        lastScrollTime = Number.NEGATIVE_INFINITY;
        quietFrames = SCROLL_IDLE_FRAMES;
        pendingCommits.clear();
    };
}
