export interface CtaI18n {
    heading: string;
    availability: string;
    buttonLabel: string;
}

export interface CtaContentRaw {
    i18n: Record<string, CtaI18n>;
}

export interface CtaContent {
    heading: string;
    availability: string;
    buttonLabel: string;
}
