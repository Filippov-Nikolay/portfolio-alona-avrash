const MAX_TRACKED_KEYS = 10_000;

export type WindowCheck = (key: string) => boolean;

export function createMemoryWindow(max: number, windowMs: number): WindowCheck {
    const hits = new Map<string, number[]>();

    function dropExpired(now: number) {
        for (const [key, timestamps] of hits) {
            if (now - timestamps[timestamps.length - 1]! >= windowMs) hits.delete(key);
        }
    }

    return (key) => {
        const now = Date.now();
        if (hits.size >= MAX_TRACKED_KEYS) dropExpired(now);

        const recent = (hits.get(key) ?? []).filter((timestamp) => now - timestamp < windowMs);
        if (recent.length >= max) {
            hits.set(key, recent);
            return true;
        }

        recent.push(now);
        hits.set(key, recent);
        return false;
    };
}
