import {
    getOverview,
    getTopProjects,
    isAnalyticsConfigured,
} from "@/entities/analytics/api/analyticsRepository";
import { listProjects } from "@/entities/project/api/projectsRepository";
import { AnalyticsOverview } from "@/widgets/AnalyticsOverview";
import { AnalyticsNotice } from "@/widgets/AnalyticsNotice";
import { PageHeader } from "@/shared/ui/PageHeader";

const DAYS = 30;

export default async function AnalyticsOverviewPage() {
    if (!isAnalyticsConfigured()) {
        return (
            <div>
                <PageHeader title="Analytics" />
                <AnalyticsNotice>
                    Not connected yet - set <code>ANALYTICS_WORKER_URL</code> and{" "}
                    <code>ANALYTICS_READ_SECRET</code> to see visitor behavior here. See{" "}
                    <code>apps/analytics-worker/README.md</code> for deploy steps.
                </AnalyticsNotice>
            </div>
        );
    }

    const [overview, projects, allProjects] = await Promise.all([
        getOverview(DAYS),
        getTopProjects(DAYS),
        listProjects(),
    ]);

    if (!overview || !projects) {
        return (
            <div>
                <PageHeader title="Analytics" />
                <AnalyticsNotice>
                    Couldn&apos;t reach the analytics worker - check it&apos;s deployed and that
                    <code> ANALYTICS_WORKER_URL</code>/<code>ANALYTICS_READ_SECRET</code> are
                    correct.
                </AnalyticsNotice>
            </div>
        );
    }

    // Keyed by the project's own numeric id (what trackEvent() actually sends
    // as entityId), not its slug - a slug changes if the project is renamed,
    // which would silently split its analytics history across two rows.
    const projectNames = Object.fromEntries(
        allProjects.map((project) => [String(project.id), project.name])
    );

    return (
        <div>
            <PageHeader title="Analytics" />
            <AnalyticsOverview
                overview={overview}
                projects={projects}
                projectNames={projectNames}
            />
        </div>
    );
}
