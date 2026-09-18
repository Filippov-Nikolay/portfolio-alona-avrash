function requireEnv(key: string, fallback?: string): string {
    const value = process.env[key] ?? fallback;

    if (!value) {
        if (typeof window === "undefined") {
            console.warn(`[env] Missing ${key} — some features may break`);
        }
        return "";
    }

    return value;
}

export const env = {
    siteUrl: requireEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000"),
};
