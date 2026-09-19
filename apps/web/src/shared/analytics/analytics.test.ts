import { describe, expect, it } from "vitest";
import { buildEventPayload, shouldDedupe } from "./analytics";

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

    it("turns an empty referrer into undefined instead of an empty string", () => {
        const payload = buildEventPayload(
            "social_click",
            { entityId: "behance" },
            { ...context, referrer: "" }
        );
        expect(payload.referrer).toBeUndefined();
    });
});
