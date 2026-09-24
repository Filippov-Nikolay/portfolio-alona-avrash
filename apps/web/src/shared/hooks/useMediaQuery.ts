"use client";

import { useCallback, useSyncExternalStore } from "react";

const getServerSnapshot = () => false;

export function useMediaQuery(query: string) {
    const getSnapshot = useCallback(() => window.matchMedia(query).matches, [query]);
    const subscribe = useCallback(
        (notify: () => void) => {
            const media = window.matchMedia(query);
            media.addEventListener("change", notify);
            return () => media.removeEventListener("change", notify);
        },
        [query]
    );
    // Hydration matches SSR. Client navigation reads the real viewport on its
    // first render, without building a desktop scene and replacing it afterward.
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
