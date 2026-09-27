import { hasAnalyticsConsent } from "@/shared/lib/privacyPreferences";

// Custom product events, kept to a short, explicit allowlist - see apps/analytics-worker/src/schema.ts for
// the server-side copy of this same list, which is the one that actually
// gets enforced.
export type AnalyticsEvent =
    | "project_open"
    | "project_gallery_view"
    | "project_external_click"
    | "works_filter"
    | "cv_download"
    | "contact_started"
    | "contact_success"
    | "social_click"
    | "page_view";

export interface TrackOptions {
    entityId?: string;
}

export interface CampaignParams {
    source?: string;
    medium?: string;
    campaign?: string;
    content?: string;
}

export interface AnalyticsEventPayload {
    eventName: AnalyticsEvent;
    entityId?: string;
    path: string;
    locale: string;
    sessionId: string;
    referrer?: string;
    utm?: CampaignParams;
}

const DEDUPE_WINDOW_MS = 30 * 60 * 1000;

// Events where re-triggering the same entityId within the window doesn't
// count as a new signal - a visitor opening/closing one project a few times,
// flipping to its gallery tab and back, or toggling one filter on and off
// shouldn't inflate that entity's count past how many people actually did it.
const DEDUPED_EVENTS = new Set<AnalyticsEvent>([
    "project_open",
    "project_gallery_view",
    "works_filter",
]);

export function shouldDedupe(now: number, lastTrackedAt: number | undefined): boolean {
    return typeof lastTrackedAt === "number" && now - lastTrackedAt < DEDUPE_WINDOW_MS;
}

export function referrerOrigin(referrer: string): string | undefined {
    if (!referrer) return undefined;
    try {
        const url = new URL(referrer);
        return url.protocol === "http:" || url.protocol === "https:" ? url.origin : undefined;
    } catch {
        return undefined;
    }
}

export function buildEventPayload(
    eventName: AnalyticsEvent,
    options: TrackOptions,
    context: {
        path: string;
        locale: string;
        sessionId: string;
        referrer: string;
        utm?: CampaignParams;
    }
): AnalyticsEventPayload {
    return {
        eventName,
        entityId: options.entityId,
        path: context.path,
        locale: context.locale,
        sessionId: context.sessionId,
        referrer: referrerOrigin(context.referrer),
        utm: context.utm,
    };
}

const CAMPAIGN_QUERY_KEYS: Record<keyof CampaignParams, string> = {
    source: "utm_source",
    medium: "utm_medium",
    campaign: "utm_campaign",
    content: "utm_content",
};
const CAMPAIGN_VALUE_MAX_LENGTH = 100;

export function readCampaign(search: string): CampaignParams | undefined {
    const query = new URLSearchParams(search);
    const campaign: CampaignParams = {};
    for (const [field, queryKey] of Object.entries(CAMPAIGN_QUERY_KEYS)) {
        const value = query.get(queryKey)?.trim().slice(0, CAMPAIGN_VALUE_MAX_LENGTH);
        if (value) campaign[field as keyof CampaignParams] = value;
    }
    return Object.keys(campaign).length > 0 ? campaign : undefined;
}

let landingCampaign: CampaignParams | undefined;

export function captureLandingCampaign(search: string): void {
    landingCampaign = readCampaign(search);
}

if (typeof window !== "undefined") captureLandingCampaign(window.location.search);

const SESSION_KEY = "avrash_analytics_session";
const SEEN_KEY = "avrash_analytics_seen";

export function clearAnalyticsStorage(): void {
    try {
        sessionStorage.removeItem(SESSION_KEY);
        sessionStorage.removeItem(SEEN_KEY);
    } catch {}
}

function getSessionId(): string {
    try {
        let id = sessionStorage.getItem(SESSION_KEY);
        if (!id) {
            id = crypto.randomUUID();
            sessionStorage.setItem(SESSION_KEY, id);
        }
        return id;
    } catch {
        return crypto.randomUUID();
    }
}

function readSeen(): Record<string, number> {
    try {
        return JSON.parse(sessionStorage.getItem(SEEN_KEY) ?? "{}");
    } catch {
        return {};
    }
}

function markTracked(dedupeKey: string): void {
    try {
        const seen = readSeen();
        seen[dedupeKey] = Date.now();
        sessionStorage.setItem(SEEN_KEY, JSON.stringify(seen));
    } catch {}
}

// Fires a small "beacon" request instead of fetch() - it survives the page
// navigating away right after (e.g. a visitor clicking View Website and
// immediately leaving), which a regular fetch() can silently cancel.
export function trackEvent(eventName: AnalyticsEvent, options: TrackOptions = {}): void {
    if (typeof window === "undefined" || typeof navigator.sendBeacon !== "function") return;
    if (!hasAnalyticsConsent()) return;

    const endpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;
    if (!endpoint) return;

    let dedupeKey: string | undefined;
    if (DEDUPED_EVENTS.has(eventName) && options.entityId) {
        dedupeKey = `${eventName}:${options.entityId}`;
        if (shouldDedupe(Date.now(), readSeen()[dedupeKey])) return;
    }

    const utm = eventName === "page_view" ? landingCampaign : undefined;
    const payload = buildEventPayload(eventName, options, {
        path: window.location.pathname,
        locale: document.documentElement.lang,
        sessionId: getSessionId(),
        referrer: document.referrer,
        utm,
    });

    // Only mark it seen once the browser actually accepted the beacon - if
    // sendBeacon() returns false (e.g. its queue is full), the next attempt
    // should still get a real chance to be sent instead of silently staying
    // "deduped" for the rest of the 30-minute window.
    const queued = navigator.sendBeacon(endpoint, JSON.stringify(payload));
    if (queued && dedupeKey) markTracked(dedupeKey);
    if (queued && utm) landingCampaign = undefined;
}
