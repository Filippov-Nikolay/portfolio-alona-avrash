import { afterEach, describe, expect, it, vi } from "vitest";
import { getClientIp, UNKNOWN_CLIENT } from "./clientIp";

const headers = (values: Record<string, string>) => new Headers(values);

afterEach(() => {
    vi.unstubAllEnvs();
});

describe("getClientIp", () => {
    it("trusts only the x-real-ip header Vercel sets", () => {
        vi.stubEnv("VERCEL", "1");
        expect(
            getClientIp(headers({ "x-real-ip": "203.0.113.7", "x-forwarded-for": "198.51.100.1" }))
        ).toBe("203.0.113.7");
        expect(getClientIp(headers({ "x-forwarded-for": "198.51.100.1" }))).toBe(UNKNOWN_CLIENT);
    });

    it("takes the hop appended by a trusted proxy, not the ones a client sent", () => {
        vi.stubEnv("TRUST_PROXY", "1");
        expect(
            getClientIp(headers({ "x-forwarded-for": "198.51.100.1, 10.0.0.2 , 203.0.113.7" }))
        ).toBe("203.0.113.7");
        expect(getClientIp(headers({ "x-real-ip": "198.51.100.1" }))).toBe(UNKNOWN_CLIENT);
    });

    it("ignores forwarding headers when no proxy is trusted", () => {
        expect(
            getClientIp(headers({ "x-forwarded-for": "198.51.100.1", "x-real-ip": "198.51.100.2" }))
        ).toBe(UNKNOWN_CLIENT);
    });
});
