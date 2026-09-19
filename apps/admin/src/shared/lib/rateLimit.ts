const attempts = new Map<string, number[]>();

export function isRateLimited(key: string, max: number, windowMs: number): boolean {
    const now = Date.now();
    const recent = (attempts.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);

    if (recent.length >= max) {
        attempts.set(key, recent);
        return true;
    }

    recent.push(now);
    attempts.set(key, recent);
    return false;
}

export function getClientIp(headers: { get(name: string): string | null }): string {
    const forwardedFor = headers.get("x-forwarded-for");
    if (forwardedFor) return forwardedFor.split(",")[0]!.trim();
    return headers.get("x-real-ip") ?? "unknown";
}
