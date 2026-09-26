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

export interface TrafficTimelinePoint {
    date: string;
    pageViews: number;
    visitors: number;
}

export interface PageStat {
    path: string;
    views: number;
    visitors: number;
    percent: number;
}

export interface ShareBreakdown {
    key: string;
    visitors: number;
    percent: number;
}

export interface TrafficOverview {
    pageViews: number;
    visitors: number;
    viewsPerVisitor: number;
    timeline: TrafficTimelinePoint[];
    pages: PageStat[];
    countries: ShareBreakdown[];
    devices: ShareBreakdown[];
    operatingSystems: ShareBreakdown[];
    browsers: ShareBreakdown[];
    languages: ShareBreakdown[];
    referrers: ShareBreakdown[];
}

export interface EntityCount {
    entityId: string;
    count: number;
    percent: number;
}

export interface EngagementSummary {
    cvDownloads: number;
    socialClicks: number;
    socials: EntityCount[];
}
