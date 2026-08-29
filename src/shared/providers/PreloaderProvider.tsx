"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

const STORAGE_KEY = "site:preloader";
const COOKIE_KEY = "site-preloader";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;
const DISMISS_DELAY_MS = 2250;

interface PreloaderContextValue {
    isShown: boolean;
    isReady: boolean;
    onExitComplete: () => void;
}

const PreloaderContext = createContext<PreloaderContextValue | null>(null);

interface PreloaderProviderProps {
    children: React.ReactNode;
    initialHasSeenPreloader: boolean;
}

export function PreloaderProvider({ children, initialHasSeenPreloader }: PreloaderProviderProps) {
    const [hasSeenPreloader, setHasSeenPreloader] = useState(initialHasSeenPreloader);
    const [shouldHide, setShouldHide] = useState(false);
    const [didExit, setDidExit] = useState(false);

    const isShown = !hasSeenPreloader && !shouldHide;
    const isReady = hasSeenPreloader || didExit;

    useEffect(() => {
        if (hasSeenPreloader || shouldHide) {
            return;
        }

        const timer = window.setTimeout(() => {
            setShouldHide(true);
        }, DISMISS_DELAY_MS);

        return () => {
            window.clearTimeout(timer);
        };
    }, [hasSeenPreloader, shouldHide]);

    const onExitComplete = useCallback(() => {
        if (hasSeenPreloader || didExit) {
            return;
        }

        window.localStorage.setItem(STORAGE_KEY, "1");
        document.cookie = `${COOKIE_KEY}=1;path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
        setHasSeenPreloader(true);
        setDidExit(true);
    }, [didExit, hasSeenPreloader]);

    return (
        <PreloaderContext.Provider value={{ isShown, isReady, onExitComplete }}>
            {children}
        </PreloaderContext.Provider>
    );
}

export function usePreloader(): PreloaderContextValue {
    const ctx = useContext(PreloaderContext);
    if (!ctx) throw new Error("usePreloader must be used inside PreloaderProvider");
    return ctx;
}

PreloaderProvider.displayName = "PreloaderProvider";
