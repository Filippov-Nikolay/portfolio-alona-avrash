import {
    getProjectDetail,
    isAnalyticsConfigured,
} from "@/entities/analytics/api/analyticsRepository";
import { listProjects } from "@/entities/project/api/projectsRepository";
import { ProjectAnalytics } from "@/widgets/ProjectAnalytics";
import { AnalyticsNotice } from "@/widgets/AnalyticsNotice";
import { PageHeader } from "@/shared/ui/PageHeader";

interface ProjectAnalyticsPageProps {
    params: Promise<{ id: string }>;
}

const DAYS = 30;

export default async function ProjectAnalyticsPage({ params }: ProjectAnalyticsPageProps) {
    const { id } = await params;

    const allProjects = await listProjects();
    // entityId is the project's own numeric id (see WorksCatalog.tsx's
    // trackEvent calls), not its slug - a slug changes if the project is
    // renamed, which would silently split its analytics history in two.
    const matchingProject = allProjects.find((project) => String(project.id) === id);
    const title = matchingProject?.name ?? id;

    if (!isAnalyticsConfigured()) {
        return (
            <div>
                <PageHeader title={title} backHref="/dashboard/analytics" backLabel="Analytics" />
                <AnalyticsNotice>
                    Not connected yet - set <code>ANALYTICS_WORKER_URL</code> and{" "}
                    <code>ANALYTICS_READ_SECRET</code> to see visitor behavior here.
                </AnalyticsNotice>
            </div>
        );
    }

    const detail = await getProjectDetail(id, DAYS);

    if (!detail) {
        return (
            <div>
                <PageHeader title={title} backHref="/dashboard/analytics" backLabel="Analytics" />
                <AnalyticsNotice>
                    Couldn&apos;t reach the analytics worker - check it&apos;s deployed and
                    reachable.
                </AnalyticsNotice>
            </div>
        );
    }

    return (
        <div>
            <PageHeader title={title} backHref="/dashboard/analytics" backLabel="Analytics" />
            <ProjectAnalytics detail={detail} />
        </div>
    );
}
