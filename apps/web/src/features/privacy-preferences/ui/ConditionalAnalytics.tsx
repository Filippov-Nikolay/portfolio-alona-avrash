"use client";

import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { PageViewTracker } from "@/shared/analytics/PageViewTracker";
import { usePrivacyPreferences } from "../model/PrivacyPreferencesProvider";

export function ConditionalAnalytics() {
    const { analytics } = usePrivacyPreferences();

    if (!analytics) return null;

    return (
        <>
            <PageViewTracker />
            <SpeedInsights />
            <Analytics />
        </>
    );
}

ConditionalAnalytics.displayName = "ConditionalAnalytics";
