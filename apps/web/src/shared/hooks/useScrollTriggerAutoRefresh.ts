/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, type DependencyList } from "react";
import { ScrollTrigger } from "@/shared/lib/gsap";

let activeConsumers = 0;
let refreshRaf = 0;
let resizeObserver: ResizeObserver | null = null;
let refreshTimers: number[] = [];
let layoutSnapshot: LayoutSnapshot | null = null;

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

function handleViewportResize() {
    const next = readLayoutSnapshot();
    const previous = layoutSnapshot;
    layoutSnapshot = next;

    if (!previous) return;

    const widthChanged = Math.abs(next.viewportWidth - previous.viewportWidth) > 1;
    const heightChanged = Math.abs(next.viewportHeight - previous.viewportHeight) > 1;

    // Mobile Safari changes only the viewport height while its browser chrome
    // collapses/expands. Refreshing ScrollTrigger during that gesture moves
    // trigger boundaries and produces a visible page jump.
    if (isTouchOnlyViewport() && heightChanged && !widthChanged) return;

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

    if (!widthChanged && !documentHeightChanged) return;
    if (isTouchOnlyViewport() && heightChanged && !widthChanged) return;

    queueRefresh();
}

function queueRefresh() {
    cancelAnimationFrame(refreshRaf);
    refreshRaf = requestAnimationFrame(() => {
        ScrollTrigger.sort();
        ScrollTrigger.refresh();
    });
}

function attachSharedWatchers() {
    activeConsumers += 1;
    if (activeConsumers > 1) return;

    layoutSnapshot = readLayoutSnapshot();
    refreshTimers = [0, 250, 800].map((delay) => window.setTimeout(queueRefresh, delay));
    window.addEventListener("load", queueRefresh);
    window.addEventListener("resize", handleViewportResize);

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
    refreshTimers.forEach((timer) => window.clearTimeout(timer));
    refreshTimers = [];
    window.removeEventListener("load", queueRefresh);
    window.removeEventListener("resize", handleViewportResize);
    resizeObserver?.disconnect();
    resizeObserver = null;
    layoutSnapshot = null;
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
