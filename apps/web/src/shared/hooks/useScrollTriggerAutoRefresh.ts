/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, type DependencyList } from "react";
import { ScrollTrigger } from "@/shared/lib/gsap";

let activeConsumers = 0;
let refreshRaf = 0;
let resizeObserver: ResizeObserver | null = null;
let refreshTimers: number[] = [];
let layoutSnapshot: LayoutSnapshot | null = null;
let suppressTouchDocumentResizeUntil = 0;
let refreshRequested = false;
const activePointers = new Set<number>();

const TOUCH_CHROME_RESIZE_SETTLE_MS = 1_200;

interface LayoutSnapshot {
    viewportWidth: number;
    viewportHeight: number;
    documentHeight: number;
}

function readLayoutSnapshot(): LayoutSnapshot {
    const root = document.documentElement;

    return {
        viewportWidth: window.innerWidth,
        viewportHeight: window.innerHeight,
        documentHeight: Math.max(root.scrollHeight, document.body.scrollHeight),
    };
}

function isTouchOnlyViewport() {
    return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

function suppressHeightDrivenDocumentResize() {
    suppressTouchDocumentResizeUntil = performance.now() + TOUCH_CHROME_RESIZE_SETTLE_MS;
}

function handleViewportResize() {
    const next = readLayoutSnapshot();
    const previous = layoutSnapshot;
    layoutSnapshot = next;

    if (!previous) return;

    const widthChanged = Math.abs(next.viewportWidth - previous.viewportWidth) > 1;
    const heightChanged = Math.abs(next.viewportHeight - previous.viewportHeight) > 1;

    if (widthChanged) suppressTouchDocumentResizeUntil = 0;

    // Mobile Safari changes only the viewport height while its browser chrome
    // collapses/expands. Refreshing ScrollTrigger during that gesture moves
    // trigger boundaries and produces a visible page jump.
    if (isTouchOnlyViewport() && heightChanged && !widthChanged) {
        suppressHeightDrivenDocumentResize();
        return;
    }

    queueRefresh();
}

function handleDocumentResize() {
    const next = readLayoutSnapshot();
    const previous = layoutSnapshot;
    layoutSnapshot = next;

    if (!previous) return;

    const widthChanged = Math.abs(next.viewportWidth - previous.viewportWidth) > 1;
    const heightChanged = Math.abs(next.viewportHeight - previous.viewportHeight) > 1;
    const documentHeightChanged = Math.abs(next.documentHeight - previous.documentHeight) > 1;

    if (widthChanged) suppressTouchDocumentResizeUntil = 0;

    if (!widthChanged && !documentHeightChanged) return;
    if (isTouchOnlyViewport() && !widthChanged) {
        if (heightChanged) suppressHeightDrivenDocumentResize();
        if (heightChanged || performance.now() < suppressTouchDocumentResizeUntil) return;
    }

    queueRefresh();
}

function queueRefresh() {
    refreshRequested = true;
    if (refreshRaf) return;
    refreshRaf = requestAnimationFrame(() => {
        refreshRaf = 0;
        if (!activeConsumers || !refreshRequested) return;
        // Refresh temporarily removes pins and writes scroll positions. Wait
        // for both the gesture and inertia to finish before asking GSAP to run it.
        if (activePointers.size > 0 || ScrollTrigger.isScrolling()) return;
        refreshRequested = false;
        ScrollTrigger.sort();
        // Keep the idle check and refresh in the same task. GSAP's safe mode
        // delays again and installs a forced scrollEnd refresh; WebKit can emit
        // that event while handling the next scroll after a long rendering frame.
        ScrollTrigger.refresh();
    });
}

function flushPendingRefresh() {
    if (refreshRequested) queueRefresh();
}

function handlePointerDown(event: PointerEvent) {
    activePointers.add(event.pointerId);
}

function handlePointerUp(event: PointerEvent) {
    activePointers.delete(event.pointerId);
    flushPendingRefresh();
}

function handleBlur() {
    activePointers.clear();
    flushPendingRefresh();
}

function handleRefresh() {
    // Pin spacers change document height during refresh. Treat that resulting
    // layout as the baseline before ResizeObserver reports it back to us.
    layoutSnapshot = readLayoutSnapshot();
    refreshRequested = false;
    cancelAnimationFrame(refreshRaf);
    refreshRaf = 0;
}

function attachSharedWatchers() {
    activeConsumers += 1;
    if (activeConsumers > 1) return;

    layoutSnapshot = readLayoutSnapshot();
    refreshTimers = [0, 250, 800].map((delay) => window.setTimeout(queueRefresh, delay));
    window.addEventListener("load", queueRefresh);
    window.addEventListener("resize", handleViewportResize);
    window.addEventListener("blur", handleBlur);
    document.addEventListener("pointerdown", handlePointerDown, { passive: true, capture: true });
    document.addEventListener("pointerup", handlePointerUp, { passive: true, capture: true });
    document.addEventListener("pointercancel", handlePointerUp, { passive: true, capture: true });
    ScrollTrigger.addEventListener("scrollEnd", flushPendingRefresh);
    ScrollTrigger.addEventListener("refresh", handleRefresh);

    if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(handleDocumentResize);
        resizeObserver.observe(document.documentElement);
        resizeObserver.observe(document.body);
    }
}

function detachSharedWatchers() {
    activeConsumers -= 1;
    if (activeConsumers > 0) return;

    cancelAnimationFrame(refreshRaf);
    refreshRaf = 0;
    refreshRequested = false;
    activePointers.clear();
    refreshTimers.forEach((timer) => window.clearTimeout(timer));
    refreshTimers = [];
    window.removeEventListener("load", queueRefresh);
    window.removeEventListener("resize", handleViewportResize);
    window.removeEventListener("blur", handleBlur);
    document.removeEventListener("pointerdown", handlePointerDown, true);
    document.removeEventListener("pointerup", handlePointerUp, true);
    document.removeEventListener("pointercancel", handlePointerUp, true);
    ScrollTrigger.removeEventListener("scrollEnd", flushPendingRefresh);
    ScrollTrigger.removeEventListener("refresh", handleRefresh);
    resizeObserver?.disconnect();
    resizeObserver = null;
    layoutSnapshot = null;
    suppressTouchDocumentResizeUntil = 0;
}

export function useScrollTriggerAutoRefresh(dependencies: DependencyList = []) {
    useEffect(() => {
        attachSharedWatchers();
        queueRefresh();

        return () => {
            detachSharedWatchers();
        };
    }, dependencies);
}
