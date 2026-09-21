"use client";

import { useState } from "react";
import { LineChart } from "@/shared/ui/LineChart";
import { TopProjectsTable } from "@/widgets/TopProjectsTable";
import { cn } from "@/shared/lib/cn";
import type {
    AnalyticsOverview as AnalyticsOverviewData,
    CategoryBreakdown,
    ProjectSummary,
} from "@/entities/analytics/model/types";
import type { PeriodDays } from "@/entities/analytics/lib/period";
import styles from "./AnalyticsOverview.module.css";

type Metric = "projectOpens" | "contactStarts" | "contacts";

const METRICS: { value: Metric; label: string }[] = [
    { value: "projectOpens", label: "Project opens" },
    { value: "contactStarts", label: "Contact starts" },
    { value: "contacts", label: "Contacts" },
];

interface AnalyticsOverviewProps {
    overview: AnalyticsOverviewData;
    projects: ProjectSummary[];
    projectNames: Record<string, string>;
    categories: CategoryBreakdown[];
    categoryLabels: Record<string, string>;
    days: PeriodDays;
}

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

export function AnalyticsOverview({
    overview,
    projects,
    projectNames,
    categories,
    categoryLabels,
    days,
}: AnalyticsOverviewProps) {
    const [metric, setMetric] = useState<Metric>("projectOpens");
    const chartPoints = overview.timeline.map((point) => ({
        date: point.date,
        value: point[metric],
    }));

    return (
        <div>
            <div className={styles.stats}>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{overview.projectOpens}</span>
                    <span className={styles.statLabel}>Project opens</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{overview.contactStarts}</span>
                    <span className={styles.statLabel}>Contact starts</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{overview.contacts}</span>
                    <span className={styles.statLabel}>
                        Contacts
                        {overview.contactStarts > 0 && (
                            <> &middot; {formatPercent(overview.contactConversionRate)} of starts</>
                        )}
                    </span>
                </div>
            </div>

            <div className={styles.chartCard}>
                <div className={styles.chartHeader} role="group" aria-label="Metric">
                    {METRICS.map((option) => (
                        <button
                            key={option.value}
                            type="button"
                            className={cn(
                                styles.metricBtn,
                                metric === option.value && styles.metricBtnActive
                            )}
                            onClick={() => setMetric(option.value)}
                        >
                            {option.label}
                        </button>
                    ))}
                </div>
                <LineChart points={chartPoints} />
            </div>

            <div className={styles.breakdown}>
                <h2 className={styles.breakdownTitle}>Top categories (works_filter)</h2>
                {categories.length === 0 ? (
                    <p className={styles.muted}>No filter clicks yet.</p>
                ) : (
                    <ul className={styles.breakdownList}>
                        {categories.map((row) => (
                            <li key={row.category}>
                                <span>{categoryLabels[row.category] ?? row.category}</span>
                                <span>{formatPercent(row.percent)}</span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            <h2 className={styles.tableTitle}>Top projects</h2>
            <TopProjectsTable projects={projects} projectNames={projectNames} days={days} />
        </div>
    );
}
