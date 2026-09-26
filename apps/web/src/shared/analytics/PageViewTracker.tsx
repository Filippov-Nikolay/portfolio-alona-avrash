"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackEvent } from "./analytics";

let lastTrackedPath: string | null = null;

export function PageViewTracker() {
    const pathname = usePathname();

    useEffect(() => {
        if (!pathname || pathname === lastTrackedPath) return;
        lastTrackedPath = pathname;
        trackEvent("page_view");
    }, [pathname]);

    return null;
}
