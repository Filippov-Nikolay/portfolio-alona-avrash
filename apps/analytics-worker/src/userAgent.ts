export type DeviceType = "mobile" | "tablet" | "desktop";

export interface ClientInfo {
    device: DeviceType;
    os: string;
    browser: string;
}

const BOT_PATTERN =
    /bot|crawl|spider|slurp|preview|facebookexternalhit|embedly|quora link|whatsapp|telegram|headless|lighthouse|pingdom|uptime|monitor|curl|wget|python-requests|axios|node-fetch|go-http-client|java\//i;

export function isBotUserAgent(userAgent: string | null): boolean {
    if (!userAgent) return true;
    return BOT_PATTERN.test(userAgent);
}

function detectOs(ua: string): string {
    if (/windows nt/i.test(ua)) return "Windows";
    if (/iphone|ipod/i.test(ua)) return "iOS";
    if (/ipad/i.test(ua)) return "iPadOS";
    if (/android/i.test(ua)) return "Android";
    if (/cros/i.test(ua)) return "ChromeOS";
    if (/mac os x|macintosh/i.test(ua)) return "macOS";
    if (/linux/i.test(ua)) return "Linux";
    return "Other";
}

function detectBrowser(ua: string): string {
    if (/edg(e|a|ios)?\//i.test(ua)) return "Edge";
    if (/opr\/|opera/i.test(ua)) return "Opera";
    if (/samsungbrowser/i.test(ua)) return "Samsung Internet";
    if (/yabrowser/i.test(ua)) return "Yandex";
    if (/firefox|fxios/i.test(ua)) return "Firefox";
    if (/chrome|crios|chromium/i.test(ua)) return "Chrome";
    if (/safari/i.test(ua)) return "Safari";
    return "Other";
}

function detectDevice(ua: string, os: string): DeviceType {
    if (/ipad|tablet|kindle|silk|playbook/i.test(ua)) return "tablet";
    if (os === "Android" && !/mobile/i.test(ua)) return "tablet";
    if (/mobi|iphone|ipod|android|windows phone/i.test(ua)) return "mobile";
    return "desktop";
}

export function parseUserAgent(userAgent: string | null): ClientInfo {
    const ua = userAgent ?? "";
    const os = detectOs(ua);
    return { device: detectDevice(ua, os), os, browser: detectBrowser(ua) };
}

export async function computeVisitorId(input: {
    ip: string | null;
    userAgent: string | null;
    salt: string;
    now?: number;
}): Promise<string | null> {
    if (!input.ip || !input.salt) return null;
    const day = new Date(input.now ?? Date.now()).toISOString().slice(0, 10);
    const data = new TextEncoder().encode(
        `${input.salt}|${day}|${input.ip}|${input.userAgent ?? ""}`
    );
    const digest = await crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest).slice(0, 16), (byte) =>
        byte.toString(16).padStart(2, "0")
    ).join("");
}
