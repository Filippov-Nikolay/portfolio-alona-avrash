"use client";

import { useState } from "react";
import { LineChart } from "@/shared/ui/LineChart";
import { TopProjectsTable } from "@/widgets/TopProjectsTable";
import { cn } from "@/shared/lib/cn";
import type {
    AnalyticsOverview as AnalyticsOverviewData,
    ProjectSummary,
} from "@/entities/analytics/model/types";
import type { PeriodDays } from "@/entities/analytics/lib/period";
import styles from "./AnalyticsOverview.module.css";

type Metric = "projectOpens" | "contacts";

const METRICS: { value: Metric; label: string }[] = [
    { value: "projectOpens", label: "Project opens" },
    { value: "contacts", label: "Contacts" },
];

interface AnalyticsOverviewProps {
    overview: AnalyticsOverviewData;
    projects: ProjectSummary[];
    projectNames: Record<string, string>;
    days: PeriodDays;
}

export function AnalyticsOverview({
    overview,
    projects,
    projectNames,
    days,
}: AnalyticsOverviewProps) {
    const [metric, setMetric] = useState<Metric>("projectOpens");
    const chartPoints = overview.timeline.map((point) => ({
        date: point.date,
        value: metric === "projectOpens" ? point.projectOpens : point.contacts,
    }));

    return (
        <div>
            <div className={styles.stats}>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{overview.projectOpens}</span>
                    <span className={styles.statLabel}>Project opens</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{overview.contacts}</span>
                    <span className={styles.statLabel}>Contacts</span>
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

            <h2 className={styles.tableTitle}>Top projects</h2>
            <TopProjectsTable projects={projects} projectNames={projectNames} days={days} />
        </div>
    );
}
