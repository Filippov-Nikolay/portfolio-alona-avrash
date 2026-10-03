export const UNKNOWN_CLIENT = "unknown";

interface HeaderReader {
    get(name: string): string | null;
}

export function getClientIp(headers: HeaderReader): string {
    if (process.env.VERCEL === "1") {
        return headers.get("x-real-ip")?.trim() || UNKNOWN_CLIENT;
    }

    if (process.env.TRUST_PROXY === "1") {
        const hops = (headers.get("x-forwarded-for") ?? "")
            .split(",")
            .map((hop) => hop.trim())
            .filter(Boolean);
        return hops.at(-1) ?? UNKNOWN_CLIENT;
    }

    return UNKNOWN_CLIENT;
}
