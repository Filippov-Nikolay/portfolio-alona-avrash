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
    it("accepts the exact bearer token", async () => {
        const request = new Request(URL, { headers: { Authorization: "Bearer secret" } });
        expect(await isAuthorizedRead(request, "secret")).toBe(true);
    });

    it("rejects a wrong token", async () => {
        const request = new Request(URL, { headers: { Authorization: "Bearer wrong" } });
        expect(await isAuthorizedRead(request, "secret")).toBe(false);
    });

    it("rejects a missing Authorization header", async () => {
        const request = new Request(URL);
        expect(await isAuthorizedRead(request, "secret")).toBe(false);
    });

    it.each([
        ["a token that only shares a prefix", "Bearer secre"],
        ["a longer token", "Bearer secret-and-more"],
        ["the token without the scheme", "secret"],
        ["the scheme in another case", "bearer secret"],
    ])("rejects %s", async (_case, authorization) => {
        const request = new Request(URL, { headers: { Authorization: authorization } });
        expect(await isAuthorizedRead(request, "secret")).toBe(false);
    });

    it("never authorizes when no secret is configured", async () => {
        const request = new Request(URL, { headers: { Authorization: "Bearer " } });
        expect(await isAuthorizedRead(request, "")).toBe(false);
    });
});
