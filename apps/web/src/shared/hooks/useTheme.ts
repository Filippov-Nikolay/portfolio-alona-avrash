"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { hasPreferencesConsent } from "@/shared/lib/privacyPreferences";

export type Theme = "dark" | "light";

const STORAGE_KEY = "site-theme";
const COOKIE_KEY = "site-theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const DEFAULT_THEME: Theme = "light";

export function clearStoredTheme(): void {
    if (typeof window === "undefined") return;
    try {
        localStorage.removeItem(STORAGE_KEY);
    } catch {}
    document.cookie = `${COOKIE_KEY}=;path=/;max-age=0;SameSite=Lax`;
}

function getInitialTheme(): Theme {
    if (typeof window === "undefined") return DEFAULT_THEME;

    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "dark" || stored === "light" ? stored : DEFAULT_THEME;
}

function withoutTransition(update: () => void) {
    const style = document.createElement("style");
    style.textContent = "*, *::before, *::after { transition: none !important; }";
    document.head.appendChild(style);
    update();

    requestAnimationFrame(() => {
        requestAnimationFrame(() => style.remove());
    });
}

function isWebKitEngine() {
    const userAgent = navigator.userAgent;

    return (
        /AppleWebKit/i.test(userAgent) &&
        !/(Chrome|Chromium|Edg|OPR|SamsungBrowser)/i.test(userAgent)
    );
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
    const cssTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const transitionRunRef = useRef(0);
    const pendingThemeRef = useRef<Theme | null>(null);

    useEffect(() => {
        return () => {
            if (cssTimerRef.current) {
                clearTimeout(cssTimerRef.current);
                cssTimerRef.current = null;
            }

            transitionRunRef.current += 1;
            pendingThemeRef.current = null;
            document.documentElement.classList.remove("is-theme-changing", "vt-running");
        };
    }, []);

    useEffect(() => {
        const initial = getInitialTheme();
        withoutTransition(() => {
            document.documentElement.setAttribute("data-theme", initial);
        });

        // Sync React with localStorage and the server-rendered DOM after mount.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTheme(initial);
    }, []);

    const toggle = useCallback(() => {
        const html = document.documentElement;
        const current =
            pendingThemeRef.current ??
            (html.getAttribute("data-theme") === "dark" ? "dark" : "light");
        const next: Theme = current === "dark" ? "light" : "dark";
        pendingThemeRef.current = next;

        const persistTheme = () => {
            if (!hasPreferencesConsent()) return;
            localStorage.setItem(STORAGE_KEY, next);
            document.cookie = `${COOKIE_KEY}=${next};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
        };

        const applyTheme = (synchronous: boolean) => {
            const update = () => {
                html.setAttribute("data-theme", next);
                setTheme(next);
            };

            if (synchronous) {
                flushSync(update);
            } else {
                update();
            }

            persistTheme();
        };

        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        const hasLiveBackdrop = document.querySelector('[data-preset="hero"]') !== null;

        // WebKit can output a blank compositor frame when a complex scene with
        // backdrop-filter is captured by View Transitions. Switch atomically on
        // that engine; a clean single-frame update is preferable to a flash.
        if (hasLiveBackdrop && isWebKitEngine()) {
            transitionRunRef.current += 1;
            if (cssTimerRef.current) clearTimeout(cssTimerRef.current);
            html.classList.remove("is-theme-changing", "vt-running");
            withoutTransition(() => applyTheme(false));
            pendingThemeRef.current = null;
            return;
        }

        if (!prefersReduced && "startViewTransition" in document) {
            const runId = ++transitionRunRef.current;
            html.classList.remove("is-theme-changing");
            html.classList.add("vt-running");

            const finish = () => {
                if (transitionRunRef.current !== runId) return;

                pendingThemeRef.current = null;
                html.classList.remove("vt-running");
            };

            try {
                const transition = (
                    document as Document & {
                        startViewTransition: (callback: () => void) => {
                            finished: Promise<void>;
                        };
                    }
                ).startViewTransition(() => {
                    if (transitionRunRef.current !== runId) return;
                    applyTheme(true);
                });

                // Handle both completion and skipped/aborted transitions without
                // creating an unhandled rejected promise from Promise.finally().
                void transition.finished.then(finish, finish);
            } catch {
                finish();
                applyTheme(false);
                pendingThemeRef.current = null;
            }

            return;
        }

        transitionRunRef.current += 1;
        html.classList.remove("vt-running");
        if (cssTimerRef.current) clearTimeout(cssTimerRef.current);
        html.classList.add("is-theme-changing");
        applyTheme(false);
        pendingThemeRef.current = null;
        cssTimerRef.current = setTimeout(() => {
            html.classList.remove("is-theme-changing");
            cssTimerRef.current = null;
        }, 450);
    }, []);

    return { theme, toggle };
}
