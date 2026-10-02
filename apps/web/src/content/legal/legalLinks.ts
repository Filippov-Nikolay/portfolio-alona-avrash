export type LegalDocSlug = "privacy" | "cookies" | "terms" | "privacy-preferences";

export const LEGAL_ROUTES: Record<LegalDocSlug, string> = {
    privacy: "/legal/privacy",
    cookies: "/legal/cookies",
    terms: "/legal/terms",
    "privacy-preferences": "/legal/privacy-preferences",
};

export const LEGAL_DOC_TITLES: Record<LegalDocSlug, string> = {
    privacy: "Privacy Policy",
    cookies: "Cookie & Browser Storage Policy",
    terms: "Terms of Use",
    "privacy-preferences": "Privacy Preferences & Consent Notice",
};
