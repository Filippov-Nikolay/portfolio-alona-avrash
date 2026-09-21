export interface TimelinePoint {
    date: string;
    count: number;
}

export interface OverviewTimelinePoint {
    date: string;
    projectOpens: number;
    contactStarts: number;
    contacts: number;
}

export interface AnalyticsOverview {
    projectOpens: number;
    contactStarts: number;
    contacts: number;
    contactConversionRate: number;
    timeline: OverviewTimelinePoint[];
}

export interface ProjectSummary {
    entityId: string;
    opens: number;
    externalClicks: number;
    ctr: number;
    galleryViews: number;
    galleryViewRate: number;
}

export interface CountryBreakdown {
    country: string;
    percent: number;
}

export interface LocaleBreakdown {
    locale: string;
    percent: number;
}

export interface CategoryBreakdown {
    category: string;
    percent: number;
}

export interface ProjectDetail extends ProjectSummary {
    timeline: TimelinePoint[];
    countries: CountryBreakdown[];
    languages: LocaleBreakdown[];
}
