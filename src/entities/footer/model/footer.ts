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
