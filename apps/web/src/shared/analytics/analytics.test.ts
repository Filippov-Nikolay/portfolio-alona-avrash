import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
    buildEventPayload,
    captureLandingCampaign,
    readCampaign,
    shouldDedupe,
    trackEvent,
} from "./analytics";

describe("shouldDedupe", () => {
    it("returns false when the entity was never tracked", () => {
        expect(shouldDedupe(Date.now(), undefined)).toBe(false);
    });

    it("returns true within the 30 minute window", () => {
        const now = Date.now();
        expect(shouldDedupe(now, now - 10 * 60 * 1000)).toBe(true);
    });

    it("returns false once the 30 minute window has passed", () => {
        const now = Date.now();
        expect(shouldDedupe(now, now - 31 * 60 * 1000)).toBe(false);
    });

    it("treats exactly 30 minutes as expired", () => {
        const now = Date.now();
        expect(shouldDedupe(now, now - 30 * 60 * 1000)).toBe(false);
    });
});

describe("buildEventPayload", () => {
    const context = {
        path: "/en/works",
        locale: "en",
        sessionId: "84f3c1a2-0000-0000-0000-000000000000",
        referrer: "https://google.com",
    };

    it("includes the entityId when given", () => {
        expect(buildEventPayload("project_open", { entityId: "crusty" }, context)).toEqual({
            eventName: "project_open",
            entityId: "crusty",
            path: "/en/works",
            locale: "en",
            sessionId: context.sessionId,
            referrer: "https://google.com",
        });
    });

    it("omits entityId when not given", () => {
        expect(buildEventPayload("cv_download", {}, context).entityId).toBeUndefined();
    });

    it("sends only the referrer origin, never its path or query", () => {
        const payload = buildEventPayload(
            "page_view",
            {},
            { ...context, referrer: "https://www.google.com/search?q=alona+avrash#top" }
        );
        expect(payload.referrer).toBe("https://www.google.com");
    });

    it("drops a referrer that is not an http(s) URL", () => {
        const payload = buildEventPayload(
            "page_view",
            {},
            { ...context, referrer: "android-app://com.google.android.gm/" }
        );
        expect(payload.referrer).toBeUndefined();
    });

    it("turns an empty referrer into undefined instead of an empty string", () => {
        const payload = buildEventPayload(
            "social_click",
            { entityId: "behance" },
            { ...context, referrer: "" }
        );
        expect(payload.referrer).toBeUndefined();
    });
});

describe("readCampaign", () => {
    it("keeps only the four allowlisted UTM parameters", () => {
        expect(
            readCampaign(
                "?utm_source=instagram&utm_medium=social&utm_campaign=spring&utm_content=bio&utm_term=x&gclid=y&ref=z"
            )
        ).toEqual({ source: "instagram", medium: "social", campaign: "spring", content: "bio" });
    });

    it("trims, caps the length and skips empty values", () => {
        expect(
            readCampaign(`?utm_source=%20behance%20&utm_medium=&utm_campaign=${"a".repeat(150)}`)
        ).toEqual({ source: "behance", campaign: "a".repeat(100) });
    });

    it("returns undefined when the address has no campaign", () => {
        expect(readCampaign("?page=2")).toBeUndefined();
        expect(readCampaign("")).toBeUndefined();
    });
});

function createFakeSessionStorage(): Storage {
    const store = new Map<string, string>();
    return {
        getItem: (key: string) => store.get(key) ?? null,
        setItem: (key: string, value: string) => void store.set(key, value),
        removeItem: (key: string) => void store.delete(key),
        clear: () => store.clear(),
        key: () => null,
        get length() {
            return store.size;
        },
    } as Storage;
}

describe("trackEvent", () => {
    beforeEach(() => {
        vi.stubGlobal("window", { location: { pathname: "/en/works" } });
        vi.stubGlobal("document", { documentElement: { lang: "en" }, referrer: "" });
        vi.stubGlobal("sessionStorage", createFakeSessionStorage());
        const localStorage = createFakeSessionStorage();
        localStorage.setItem(
            "avrash-privacy-preferences",
            JSON.stringify({
                version: 1,
                preferences: false,
                analytics: true,
                updatedAt: "2026-09-27T00:00:00.000Z",
            })
        );
        vi.stubGlobal("localStorage", localStorage);
        vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENDPOINT", "https://analytics.example.com/event");
    });

    afterEach(() => {
        vi.unstubAllGlobals();
        vi.unstubAllEnvs();
    });

    it("does not mark project_open as seen when sendBeacon fails to queue - it gets a real retry", () => {
        vi.stubGlobal("navigator", { sendBeacon: vi.fn().mockReturnValue(false) });

        trackEvent("project_open", { entityId: "17" });
        trackEvent("project_open", { entityId: "17" });

        expect(navigator.sendBeacon).toHaveBeenCalledTimes(2);
    });

    it("marks project_open as seen only once sendBeacon actually queues it", () => {
        vi.stubGlobal("navigator", { sendBeacon: vi.fn().mockReturnValue(true) });

        trackEvent("project_open", { entityId: "17" });
        trackEvent("project_open", { entityId: "17" });

        expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
    });

    it("sends nothing without analytics consent", () => {
        vi.stubGlobal("localStorage", createFakeSessionStorage());
        vi.stubGlobal("navigator", { sendBeacon: vi.fn().mockReturnValue(true) });

        trackEvent("page_view");
        trackEvent("cv_download");

        expect(navigator.sendBeacon).not.toHaveBeenCalled();
    });

    it("attaches the landing campaign to the first page view only", () => {
        vi.stubGlobal("navigator", { sendBeacon: vi.fn().mockReturnValue(true) });
        captureLandingCampaign("?utm_source=instagram&utm_campaign=spring");

        trackEvent("cv_download");
        trackEvent("page_view");
        trackEvent("page_view");

        const sent = vi
            .mocked(navigator.sendBeacon)
            .mock.calls.map(([, body]) => JSON.parse(String(body)));
        expect(sent.map((payload) => payload.utm)).toEqual([
            undefined,
            { source: "instagram", campaign: "spring" },
            undefined,
        ]);
    });

    it("keeps the landing campaign for a retry when the beacon is not queued", () => {
        const sendBeacon = vi.fn().mockReturnValueOnce(false).mockReturnValue(true);
        vi.stubGlobal("navigator", { sendBeacon });
        captureLandingCampaign("?utm_source=behance");

        trackEvent("page_view");
        trackEvent("page_view");

        expect(JSON.parse(String(sendBeacon.mock.calls[1]![1])).utm).toEqual({
            source: "behance",
        });
    });

    it("does nothing when no analytics endpoint is configured", () => {
        vi.stubEnv("NEXT_PUBLIC_ANALYTICS_ENDPOINT", "");
        vi.stubGlobal("navigator", { sendBeacon: vi.fn() });

        trackEvent("project_open", { entityId: "17" });

        expect(navigator.sendBeacon).not.toHaveBeenCalled();
    });

    it.each(["project_gallery_view", "works_filter"] as const)(
        "also dedupes repeated %s for the same entityId",
        (eventName) => {
            vi.stubGlobal("navigator", { sendBeacon: vi.fn().mockReturnValue(true) });

            trackEvent(eventName, { entityId: "17" });
            trackEvent(eventName, { entityId: "17" });

            expect(navigator.sendBeacon).toHaveBeenCalledTimes(1);
        }
    );

    it("does not dedupe contact_started - it has no entityId to key on and only fires once per form anyway", () => {
        vi.stubGlobal("navigator", { sendBeacon: vi.fn().mockReturnValue(true) });

        trackEvent("contact_started");
        trackEvent("contact_started");

        expect(navigator.sendBeacon).toHaveBeenCalledTimes(2);
    });
});
