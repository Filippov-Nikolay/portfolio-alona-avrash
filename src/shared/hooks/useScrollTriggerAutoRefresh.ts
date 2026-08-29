/* eslint-disable react-hooks/exhaustive-deps */
"use client";

import { useEffect, type DependencyList } from "react";
import { ScrollTrigger } from "@/shared/lib/gsap";

export function useScrollTriggerAutoRefresh(dependencies: DependencyList = []) {
    useEffect(() => {
        let refreshRaf = 0;

        const queueRefresh = () => {
            cancelAnimationFrame(refreshRaf);
            refreshRaf = requestAnimationFrame(() => {
                ScrollTrigger.refresh();
            });
        };

        const refreshTimers = [0, 250, 800].map((delay) => window.setTimeout(queueRefresh, delay));
        window.addEventListener("load", queueRefresh);

        let resizeObserver: ResizeObserver | null = null;
        if (typeof ResizeObserver !== "undefined") {
            resizeObserver = new ResizeObserver(queueRefresh);
            resizeObserver.observe(document.documentElement);
            resizeObserver.observe(document.body);
        }

        queueRefresh();

        return () => {
            cancelAnimationFrame(refreshRaf);
            refreshTimers.forEach((timer) => window.clearTimeout(timer));
            window.removeEventListener("load", queueRefresh);
            resizeObserver?.disconnect();
        };
    }, dependencies);
}
