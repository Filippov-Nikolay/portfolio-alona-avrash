const STORAGE_KEY = "avrash-privacy-preferences";
const CURRENT_VERSION = 1;

export interface PrivacyPreferences {
    preferences: boolean;
    analytics: boolean;
}

export interface StoredPrivacyPreferences extends PrivacyPreferences {
    version: number;
    updatedAt: string;
}

function isStoredPrivacyPreferences(value: unknown): value is StoredPrivacyPreferences {
    if (typeof value !== "object" || value === null) return false;
    const candidate = value as Record<string, unknown>;
    return (
        typeof candidate.version === "number" &&
        typeof candidate.preferences === "boolean" &&
        typeof candidate.analytics === "boolean" &&
        typeof candidate.updatedAt === "string"
    );
}

export function getStoredPrivacyPreferences(): StoredPrivacyPreferences | null {
    if (typeof window === "undefined") return null;

    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw);
        return isStoredPrivacyPreferences(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

export function savePrivacyPreferences(preferences: PrivacyPreferences): StoredPrivacyPreferences {
    const stored: StoredPrivacyPreferences = {
        version: CURRENT_VERSION,
        preferences: preferences.preferences,
        analytics: preferences.analytics,
        updatedAt: new Date().toISOString(),
    };

    if (typeof window !== "undefined") {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
        } catch {}
    }

    return stored;
}

export function hasPreferencesConsent(): boolean {
    return getStoredPrivacyPreferences()?.preferences === true;
}

export function hasAnalyticsConsent(): boolean {
    return getStoredPrivacyPreferences()?.analytics === true;
}
