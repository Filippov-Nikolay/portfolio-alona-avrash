export const CONSENT_STORAGE_KEY = "avrash-privacy-preferences";

export function consentValue(analytics: boolean, preferences = analytics): string {
    return JSON.stringify({
        version: 1,
        preferences,
        analytics,
        updatedAt: "2026-01-01T00:00:00.000Z",
    });
}

export function acceptedConsentState(origin: string) {
    return {
        cookies: [],
        origins: [
            {
                origin,
                localStorage: [{ name: CONSENT_STORAGE_KEY, value: consentValue(true) }],
            },
        ],
    };
}
