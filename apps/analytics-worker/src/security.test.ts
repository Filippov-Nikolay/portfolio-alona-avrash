import { describe, expect, it } from "vitest";
import { isAllowedOrigin, isAuthorizedRead } from "./security";

const URL = "https://analytics.example.com/event";

describe("isAllowedOrigin", () => {
    it("accepts a request whose Origin matches exactly", () => {
        const request = new Request(URL, { headers: { Origin: "https://avrash.com" } });
        expect(isAllowedOrigin(request, "https://avrash.com")).toBe(true);
    });

    it("rejects a mismatched Origin", () => {
        const request = new Request(URL, { headers: { Origin: "https://evil.example.com" } });
        expect(isAllowedOrigin(request, "https://avrash.com")).toBe(false);
    });

    it("rejects a missing Origin header", () => {
        const request = new Request(URL);
        expect(isAllowedOrigin(request, "https://avrash.com")).toBe(false);
    });

    it("is case-sensitive and exact, not a prefix match", () => {
        const request = new Request(URL, {
            headers: { Origin: "https://avrash.com.evil.com" },
        });
        expect(isAllowedOrigin(request, "https://avrash.com")).toBe(false);
    });
});

describe("isAuthorizedRead", () => {
    it("accepts the exact bearer token", () => {
        const request = new Request(URL, { headers: { Authorization: "Bearer secret" } });
        expect(isAuthorizedRead(request, "secret")).toBe(true);
    });

    it("rejects a wrong token", () => {
        const request = new Request(URL, { headers: { Authorization: "Bearer wrong" } });
        expect(isAuthorizedRead(request, "secret")).toBe(false);
    });

    it("rejects a missing Authorization header", () => {
        const request = new Request(URL);
        expect(isAuthorizedRead(request, "secret")).toBe(false);
    });
});
