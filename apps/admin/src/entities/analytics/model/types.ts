export interface TimelinePoint {
    date: string;
    count: number;
}

export interface DualTimelinePoint {
    date: string;
    projectOpens: number;
    contacts: number;
}

export interface AnalyticsOverview {
    projectOpens: number;
    contacts: number;
    timeline: DualTimelinePoint[];
}

export interface ProjectSummary {
    entityId: string;
    opens: number;
    externalClicks: number;
    ctr: number;
}

export interface CountryBreakdown {
    country: string;
    percent: number;
}

export interface LocaleBreakdown {
    locale: string;
    percent: number;
}

export interface ProjectDetail extends ProjectSummary {
    timeline: TimelinePoint[];
    countries: CountryBreakdown[];
    languages: LocaleBreakdown[];
}
