"use client";

import { useSyncExternalStore } from "react";

const QUERY = "(prefers-reduced-motion: reduce)";
const getSnapshot = () => window.matchMedia(QUERY).matches;
const getServerSnapshot = () => false;
const subscribe = (notify: () => void) => {
    const media = window.matchMedia(QUERY);
    media.addEventListener("change", notify);
    return () => media.removeEventListener("change", notify);
};

/** Also react when the preference changes while a scroll scene is mounted. */
export function useReducedMotionPreference() {
    return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
