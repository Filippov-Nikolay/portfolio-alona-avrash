export type LegalDocSlug = "privacy" | "cookies" | "terms";

export const LEGAL_ROUTES: Record<LegalDocSlug, string> = {
    privacy: "/legal/privacy",
    cookies: "/legal/cookies",
    terms: "/legal/terms",
};

export const LEGAL_DOC_TITLES: Record<LegalDocSlug, string> = {
    privacy: "Privacy Policy",
    cookies: "Cookie & Browser Storage Policy",
    terms: "Terms of Use",
};
