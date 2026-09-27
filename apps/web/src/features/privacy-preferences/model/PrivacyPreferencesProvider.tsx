"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
    getStoredPrivacyPreferences,
    savePrivacyPreferences,
    type PrivacyPreferences,
} from "@/shared/lib/privacyPreferences";
import { clearAnalyticsStorage } from "@/shared/analytics/analytics";
import { clearStoredTheme } from "@/shared/hooks/useTheme";
import { clearStoredPreloaderFlag } from "@/shared/providers/PreloaderProvider";

type ConsentStatus = "checking" | "decided" | "undecided";

interface ConsentState {
    status: ConsentStatus;
    preferences: boolean;
    analytics: boolean;
}

interface PrivacyPreferencesContextValue {
    preferences: boolean;
    analytics: boolean;
    isBannerVisible: boolean;
    isPanelOpen: boolean;
    acceptOptional: () => void;
    rejectOptional: () => void;
    savePreferences: (next: PrivacyPreferences) => void;
    openPanel: () => void;
    closePanel: () => void;
}

const INITIAL_STATE: ConsentState = { status: "checking", preferences: false, analytics: false };

const PrivacyPreferencesContext = createContext<PrivacyPreferencesContextValue | null>(null);

export function PrivacyPreferencesProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<ConsentState>(INITIAL_STATE);
    const [isPanelOpen, setIsPanelOpen] = useState(false);

    useEffect(() => {
        const stored = getStoredPrivacyPreferences();
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setState(
            stored
                ? {
                      status: "decided",
                      preferences: stored.preferences,
                      analytics: stored.analytics,
                  }
                : { status: "undecided", preferences: false, analytics: false }
        );
    }, []);

    const persist = useCallback((next: PrivacyPreferences) => {
        savePrivacyPreferences(next);
        if (!next.preferences) {
            clearStoredTheme();
            clearStoredPreloaderFlag();
        }
        if (!next.analytics) clearAnalyticsStorage();
        setState({ status: "decided", preferences: next.preferences, analytics: next.analytics });
        setIsPanelOpen(false);
    }, []);

    const acceptOptional = useCallback(
        () => persist({ preferences: true, analytics: true }),
        [persist]
    );
    const rejectOptional = useCallback(
        () => persist({ preferences: false, analytics: false }),
        [persist]
    );
    const openPanel = useCallback(() => setIsPanelOpen(true), []);
    const closePanel = useCallback(() => setIsPanelOpen(false), []);

    return (
        <PrivacyPreferencesContext.Provider
            value={{
                preferences: state.preferences,
                analytics: state.analytics,
                isBannerVisible: state.status === "undecided" && !isPanelOpen,
                isPanelOpen,
                acceptOptional,
                rejectOptional,
                savePreferences: persist,
                openPanel,
                closePanel,
            }}
        >
            {children}
        </PrivacyPreferencesContext.Provider>
    );
}

export function usePrivacyPreferences(): PrivacyPreferencesContextValue {
    const ctx = useContext(PrivacyPreferencesContext);
    if (!ctx) {
        throw new Error("usePrivacyPreferences must be used inside PrivacyPreferencesProvider");
    }
    return ctx;
}

PrivacyPreferencesProvider.displayName = "PrivacyPreferencesProvider";
