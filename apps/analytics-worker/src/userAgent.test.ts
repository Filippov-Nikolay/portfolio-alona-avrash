import { describe, expect, it } from "vitest";
import { computeVisitorId, isBotUserAgent, parseUserAgent } from "./userAgent";

const IPHONE =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const IPAD =
    "Mozilla/5.0 (iPad; CPU OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1";
const ANDROID_PHONE =
    "Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";
const ANDROID_TABLET =
    "Mozilla/5.0 (Linux; Android 14; SM-X710) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36";
const WINDOWS_EDGE =
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36 Edg/140.0.0.0";
const MAC_FIREFOX =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 15.5; rv:142.0) Gecko/20100101 Firefox/142.0";
const MAC_SAFARI =
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 15_5) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/26.0 Safari/605.1.15";

describe("parseUserAgent", () => {
    it.each([
        [IPHONE, { device: "mobile", os: "iOS", browser: "Safari" }],
        [IPAD, { device: "tablet", os: "iPadOS", browser: "Safari" }],
        [ANDROID_PHONE, { device: "mobile", os: "Android", browser: "Chrome" }],
        [ANDROID_TABLET, { device: "tablet", os: "Android", browser: "Chrome" }],
        [WINDOWS_EDGE, { device: "desktop", os: "Windows", browser: "Edge" }],
        [MAC_FIREFOX, { device: "desktop", os: "macOS", browser: "Firefox" }],
        [MAC_SAFARI, { device: "desktop", os: "macOS", browser: "Safari" }],
    ])("classifies %s", (userAgent, expected) => {
        expect(parseUserAgent(userAgent)).toEqual(expected);
    });

    it("falls back to Other on an unknown or missing agent", () => {
        expect(parseUserAgent(null)).toEqual({ device: "desktop", os: "Other", browser: "Other" });
    });
});

describe("isBotUserAgent", () => {
    it.each([
        "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
        "TelegramBot (like TwitterBot)",
        "facebookexternalhit/1.1",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/140.0.0.0 Safari/537.36",
        "curl/8.7.1",
    ])("treats %s as a bot", (userAgent) => {
        expect(isBotUserAgent(userAgent)).toBe(true);
    });

    it("treats a missing agent as a bot and real browsers as people", () => {
        expect(isBotUserAgent(null)).toBe(true);
        expect(isBotUserAgent(IPHONE)).toBe(false);
        expect(isBotUserAgent(WINDOWS_EDGE)).toBe(false);
    });
});

describe("computeVisitorId", () => {
    const base = { ip: "203.0.113.7", userAgent: IPHONE, salt: "secret" };
    const noon = Date.UTC(2026, 8, 26, 12);

    it("is a stable 32-character hash within one day", async () => {
        const morning = await computeVisitorId({ ...base, now: Date.UTC(2026, 8, 26, 1) });
        const evening = await computeVisitorId({ ...base, now: Date.UTC(2026, 8, 26, 23) });
        expect(morning).toMatch(/^[0-9a-f]{32}$/);
        expect(evening).toBe(morning);
    });

    it("rotates across days and differs per device, address and salt", async () => {
        const today = await computeVisitorId({ ...base, now: noon });
        await expect(
            computeVisitorId({ ...base, now: noon + 24 * 60 * 60 * 1000 })
        ).resolves.not.toBe(today);
        await expect(computeVisitorId({ ...base, userAgent: IPAD, now: noon })).resolves.not.toBe(
            today
        );
        await expect(computeVisitorId({ ...base, ip: "203.0.113.8", now: noon })).resolves.not.toBe(
            today
        );
        await expect(computeVisitorId({ ...base, salt: "other", now: noon })).resolves.not.toBe(
            today
        );
    });

    it("does not identify anyone without an address or a salt", async () => {
        await expect(computeVisitorId({ ...base, ip: null })).resolves.toBeNull();
        await expect(computeVisitorId({ ...base, salt: "" })).resolves.toBeNull();
    });
});
