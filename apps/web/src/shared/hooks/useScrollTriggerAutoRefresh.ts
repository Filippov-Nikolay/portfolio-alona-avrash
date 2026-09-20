/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, type DependencyList } from "react";
import { ScrollTrigger } from "@/shared/lib/gsap";

let activeConsumers = 0;
let refreshRaf = 0;
let resizeObserver: ResizeObserver | null = null;
let refreshTimers: number[] = [];

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

    refreshTimers = [0, 250, 800].map((delay) => window.setTimeout(queueRefresh, delay));
    window.addEventListener("load", queueRefresh);

    if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(queueRefresh);
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
    resizeObserver?.disconnect();
    resizeObserver = null;
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
