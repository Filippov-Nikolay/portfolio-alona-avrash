import type {
    AnalyticsOverview,
    CategoryBreakdown,
    EngagementSummary,
    ProjectDetail,
    ProjectSummary,
    TrafficOverview,
} from "../model/types";

export function isAnalyticsConfigured(): boolean {
    return Boolean(process.env.ANALYTICS_WORKER_URL && process.env.ANALYTICS_READ_SECRET);
}

async function fetchFromWorker<T>(path: string): Promise<T | null> {
    if (!isAnalyticsConfigured()) return null;

    const base = process.env.ANALYTICS_WORKER_URL!.replace(/\/$/, "");

    let response: Response;
    try {
        response = await fetch(`${base}${path}`, {
            headers: { Authorization: `Bearer ${process.env.ANALYTICS_READ_SECRET}` },
            cache: "no-store",
        });
    } catch (error) {
        console.error(`Analytics worker request failed: ${path}`, error);
        return null;
    }

    if (!response.ok) {
        console.error(`Analytics worker responded ${response.status} for ${path}`);
        return null;
    }

    return response.json() as Promise<T>;
}

export async function getOverview(days: number): Promise<AnalyticsOverview | null> {
    return fetchFromWorker<AnalyticsOverview>(`/analytics/overview?days=${days}`);
}

export async function getTopProjects(days: number): Promise<ProjectSummary[] | null> {
    return fetchFromWorker<ProjectSummary[]>(`/analytics/projects?days=${days}`);
}

export async function getProjectDetail(
    entityId: string,
    days: number
): Promise<ProjectDetail | null> {
    return fetchFromWorker<ProjectDetail>(
        `/analytics/projects/${encodeURIComponent(entityId)}?days=${days}`
    );
}

export async function getTopCategories(days: number): Promise<CategoryBreakdown[] | null> {
    return fetchFromWorker<CategoryBreakdown[]>(`/analytics/categories?days=${days}`);
}

export async function getTraffic(days: number): Promise<TrafficOverview | null> {
    return fetchFromWorker<TrafficOverview>(`/analytics/traffic?days=${days}`);
}

export async function getEngagement(days: number): Promise<EngagementSummary | null> {
    return fetchFromWorker<EngagementSummary>(`/analytics/engagement?days=${days}`);
}
