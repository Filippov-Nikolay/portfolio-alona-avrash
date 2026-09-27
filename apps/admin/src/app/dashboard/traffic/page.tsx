import {
    getSessions,
    getTraffic,
    isAnalyticsConfigured,
} from "@/entities/analytics/api/analyticsRepository";
import { parseDaysParam } from "@/entities/analytics/lib/period";
import { AnalyticsNotice } from "@/widgets/AnalyticsNotice";
import { PeriodSwitcher } from "@/widgets/PeriodSwitcher";
import { TrafficOverview } from "@/widgets/TrafficOverview";
import { PageHeader } from "@/shared/ui/PageHeader";
import styles from "../analytics/analytics.module.css";

interface TrafficPageProps {
    searchParams: Promise<{ days?: string | string[] }>;
}

export default async function TrafficPage({ searchParams }: TrafficPageProps) {
    const { days: rawDays } = await searchParams;
    const days = parseDaysParam(rawDays);

    if (!isAnalyticsConfigured()) {
        return (
            <div className={styles.page}>
                <PageHeader title="Traffic" />
                <AnalyticsNotice>
                    Not connected yet - set <code>ANALYTICS_WORKER_URL</code> and{" "}
                    <code>ANALYTICS_READ_SECRET</code> to see visitors and page views here.
                </AnalyticsNotice>
            </div>
        );
    }

    const [traffic, sessions] = await Promise.all([getTraffic(days), getSessions(days)]);

    if (!traffic) {
        return (
            <div className={styles.page}>
                <PageHeader title="Traffic" />
                <AnalyticsNotice>
                    Couldn&apos;t reach the analytics worker - check it&apos;s deployed and that
                    <code> ANALYTICS_WORKER_URL</code>/<code>ANALYTICS_READ_SECRET</code> are
                    correct.
                </AnalyticsNotice>
            </div>
        );
    }

    return (
        <div className={styles.page}>
            <PageHeader
                title="Traffic"
                actions={<PeriodSwitcher basePath="/dashboard/traffic" days={days} />}
            />
            <TrafficOverview traffic={traffic} sessions={sessions} />
        </div>
    );
}
