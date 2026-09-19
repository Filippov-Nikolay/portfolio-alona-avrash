import {
    getProjectDetail,
    isAnalyticsConfigured,
} from "@/entities/analytics/api/analyticsRepository";
import { parseDaysParam } from "@/entities/analytics/lib/period";
import { listProjects } from "@/entities/project/api/projectsRepository";
import { ProjectAnalytics } from "@/widgets/ProjectAnalytics";
import { AnalyticsNotice } from "@/widgets/AnalyticsNotice";
import { PeriodSwitcher } from "@/widgets/PeriodSwitcher";
import { PageHeader } from "@/shared/ui/PageHeader";

interface ProjectAnalyticsPageProps {
    params: Promise<{ id: string }>;
    searchParams: Promise<{ days?: string | string[] }>;
}

export default async function ProjectAnalyticsPage({
    params,
    searchParams,
}: ProjectAnalyticsPageProps) {
    const [{ id }, { days: rawDays }] = await Promise.all([params, searchParams]);
    const days = parseDaysParam(rawDays);
    const backHref = `/dashboard/analytics?days=${days}`;

    const allProjects = await listProjects();
    // entityId is the project's own numeric id (see WorksCatalog.tsx's
    // trackEvent calls), not its slug - a slug changes if the project is
    // renamed, which would silently split its analytics history in two.
    const matchingProject = allProjects.find((project) => String(project.id) === id);
    const title = matchingProject?.name ?? id;

    if (!isAnalyticsConfigured()) {
        return (
            <div>
                <PageHeader title={title} backHref={backHref} backLabel="Analytics" />
                <AnalyticsNotice>
                    Not connected yet - set <code>ANALYTICS_WORKER_URL</code> and{" "}
                    <code>ANALYTICS_READ_SECRET</code> to see visitor behavior here.
                </AnalyticsNotice>
            </div>
        );
    }

    const detail = await getProjectDetail(id, days);

    if (!detail) {
        return (
            <div>
                <PageHeader title={title} backHref={backHref} backLabel="Analytics" />
                <AnalyticsNotice>
                    Couldn&apos;t reach the analytics worker - check it&apos;s deployed and
                    reachable.
                </AnalyticsNotice>
            </div>
        );
    }

    return (
        <div>
            <PageHeader
                title={title}
                backHref={backHref}
                backLabel="Analytics"
                actions={<PeriodSwitcher basePath={`/dashboard/analytics/${id}`} days={days} />}
            />
            <ProjectAnalytics detail={detail} />
        </div>
    );
}
