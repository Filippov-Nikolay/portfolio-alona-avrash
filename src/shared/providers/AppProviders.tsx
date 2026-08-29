"use client";

import { useLayoutEffect } from "react";
import { MotionProvider } from "./MotionProvider";
import { ThemeProvider } from "./ThemeProvider";
import { PreloaderProvider } from "./PreloaderProvider";
import { Preloader } from "@/widgets/Preloader";

interface AppProvidersProps {
    children: React.ReactNode;
    initialHasSeenPreloader: boolean;
}

export function AppProviders({ children, initialHasSeenPreloader }: AppProvidersProps) {
    useLayoutEffect(() => {
        // Keep browser scroll restoration disabled once the app has mounted.
        if ("scrollRestoration" in history) {
            history.scrollRestoration = "manual";
        }

        const navEntry = performance.getEntriesByType("navigation")[0] as
            | PerformanceNavigationTiming
            | undefined;
        const shouldForceTop = navEntry?.type === "reload" && !window.location.hash;

        if (!shouldForceTop) {
            return;
        }

        const ensureTop = () => {
            if (window.scrollY > 0) {
                window.scrollTo(0, 0);
            }
        };

        // Browsers can restore scroll position slightly after hydration starts.
        // Re-assert top position across a couple of frames and on pageshow.
        ensureTop();
        const raf1 = requestAnimationFrame(ensureTop);
        const raf2 = requestAnimationFrame(() => requestAnimationFrame(ensureTop));
        window.addEventListener("pageshow", ensureTop);

        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
            window.removeEventListener("pageshow", ensureTop);
        };
    }, []);

    return (
        <ThemeProvider>
            <PreloaderProvider initialHasSeenPreloader={initialHasSeenPreloader}>
                <MotionProvider>
                    <Preloader />
                    {children}
                </MotionProvider>
            </PreloaderProvider>
        </ThemeProvider>
    );
}

AppProviders.displayName = "AppProviders";
