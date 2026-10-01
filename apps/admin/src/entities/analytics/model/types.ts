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
    sessions: number;
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

export interface CampaignStat {
    source: string | null;
    medium: string | null;
    campaign: string | null;
    content: string | null;
    sessions: number;
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
    campaigns: CampaignStat[];
}

export interface EntityCount {
    entityId: string;
    count: number;
    percent: number;
}

export interface EngagementTimelinePoint {
    date: string;
    cvDownloads: number;
    socialClicks: number;
}

export interface EngagementSummary {
    cvDownloads: number;
    cvLanguages?: EntityCount[];
    socialClicks: number;
    socials: EntityCount[];
    timeline: EngagementTimelinePoint[];
}

export interface FunnelStep {
    key: string;
    sessions: number;
    ofSessions: number;
    ofBase: number;
}

export interface SessionsSummary {
    sessions: number;
    pagesPerSession: number;
    eventsPerSession: number;
    bounceRate: number;
    medianDurationMs: number | null;
    projectFunnel: FunnelStep[];
    contactFunnel: FunnelStep[];
}
