import {
    getProjectDetail,
    isAnalyticsConfigured,
} from "@/entities/analytics/api/analyticsRepository";
import { slugifyProjectName } from "@/entities/analytics/lib/slugifyProjectName";
import { listProjects } from "@/entities/project/api/projectsRepository";
import { ProjectAnalytics } from "@/widgets/ProjectAnalytics";
import { AnalyticsNotice } from "@/widgets/AnalyticsNotice";
import { PageHeader } from "@/shared/ui/PageHeader";

interface ProjectAnalyticsPageProps {
    params: Promise<{ slug: string }>;
}

const DAYS = 30;

export default async function ProjectAnalyticsPage({ params }: ProjectAnalyticsPageProps) {
    const { slug } = await params;

    const allProjects = await listProjects();
    const matchingProject = allProjects.find(
        (project) => slugifyProjectName(project.name) === slug
    );
    const title = matchingProject?.name ?? slug;

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

    const detail = await getProjectDetail(slug, DAYS);

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
