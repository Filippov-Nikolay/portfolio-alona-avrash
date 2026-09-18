export interface FooterLegalLinkRaw {
    id: string;
    href: string;
}

export interface FooterI18n {
    tagline: string;
    legalLinkLabels: Record<string, string>;
}

export interface FooterContentRaw {
    brandMark: string;
    legalLinks: FooterLegalLinkRaw[];
    i18n: Record<string, FooterI18n>;
}

export interface FooterLegalLink {
    id: string;
    label: string;
    href: string;
}

export interface FooterContent {
    tagline: string;
    brandMark: string;
    legalLinks: FooterLegalLink[];
}
