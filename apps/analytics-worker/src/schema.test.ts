import { describe, expect, it } from "vitest";
import { AnalyticsEventBodySchema } from "./schema";

const VALID_BODY = {
    eventName: "project_open",
    entityId: "crusty",
    path: "/en/works",
    locale: "en",
    sessionId: "84f3c1a2-1111-4111-8111-000000000000",
    referrer: "https://google.com",
};

describe("AnalyticsEventBodySchema", () => {
    it("accepts a valid event", () => {
        expect(AnalyticsEventBodySchema.safeParse(VALID_BODY).success).toBe(true);
    });

    it("accepts an event without entityId or referrer", () => {
        const { entityId, referrer, ...rest } = VALID_BODY;
        expect(AnalyticsEventBodySchema.safeParse(rest).success).toBe(true);
    });

    it("rejects an event name outside the allowlist", () => {
        const result = AnalyticsEventBodySchema.safeParse({
            ...VALID_BODY,
            eventName: "anything_goes",
        });
        expect(result.success).toBe(false);
    });

    it("rejects a sessionId that isn't a UUID", () => {
        const result = AnalyticsEventBodySchema.safeParse({
            ...VALID_BODY,
            sessionId: "not-a-uuid",
        });
        expect(result.success).toBe(false);
    });

    it("rejects a missing path", () => {
        const { path, ...rest } = VALID_BODY;
        expect(AnalyticsEventBodySchema.safeParse(rest).success).toBe(false);
    });

    it("rejects an empty locale", () => {
        expect(AnalyticsEventBodySchema.safeParse({ ...VALID_BODY, locale: "" }).success).toBe(
            false
        );
    });
});
