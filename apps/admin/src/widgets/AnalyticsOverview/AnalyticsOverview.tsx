"use client";

import { useState, type CSSProperties } from "react";
import {
    ChartNoAxesCombined,
    Download,
    Eye,
    FolderKanban,
    GitBranch,
    MessageSquareText,
    Send,
    Share2,
    TrendingUp,
} from "lucide-react";
import { SITE_LOCALES } from "@avrash/content-schema/locale";
import { ReportTabs } from "@/shared/ui/ReportTabs/ReportTabs";
import { LineChart } from "@/shared/ui/LineChart";
import { TopProjectsTable } from "@/widgets/TopProjectsTable";
import { ConversionFunnels } from "@/widgets/ConversionFunnels";
import { cn } from "@/shared/lib/cn";
import type {
    AnalyticsOverview as AnalyticsOverviewData,
    CategoryBreakdown,
    EngagementSummary,
    ProjectSummary,
    SessionsSummary,
} from "@/entities/analytics/model/types";
import type { PeriodDays } from "@/entities/analytics/lib/period";
import styles from "./AnalyticsOverview.module.css";

type Metric = "projectOpens" | "contactStarts" | "contacts";

const METRICS: { value: Metric; label: string }[] = [
    { value: "projectOpens", label: "Project opens" },
    { value: "contactStarts", label: "Contact starts" },
    { value: "contacts", label: "Contacts" },
];

type EngagementMetric = "cvDownloads" | "socialClicks";

const ENGAGEMENT_METRICS: { value: EngagementMetric; label: string }[] = [
    { value: "cvDownloads", label: "CV downloads" },
    { value: "socialClicks", label: "Social clicks" },
];

const WEEKLY_THRESHOLD_DAYS = 30;

interface AnalyticsOverviewProps {
    overview: AnalyticsOverviewData;
    projects: ProjectSummary[];
    projectNames: Record<string, string>;
    categories: CategoryBreakdown[];
    categoryLabels: Record<string, string>;
    engagement: EngagementSummary | null;
    sessions: SessionsSummary | null;
    days: PeriodDays;
}

function cvLanguageName(code: string): string {
    return SITE_LOCALES.find((locale) => locale.code === code)?.name ?? code.toUpperCase();
}

function socialName(id: string): string {
    return id
        .split(/[-_]/)
        .filter(Boolean)
        .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
        .join(" ");
}

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US").format(value);
}

function formatDateRange(points: AnalyticsOverviewData["timeline"]): string {
    if (points.length === 0) return "No activity recorded";

    const format = (date: string) =>
        new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
        });

    return `${format(points[0]!.date)} - ${format(points.at(-1)!.date)}`;
}

export function AnalyticsOverview({
    overview,
    projects,
    projectNames,
    categories,
    categoryLabels,
    engagement,
    sessions,
    days,
}: AnalyticsOverviewProps) {
    const [metric, setMetric] = useState<Metric>("projectOpens");
    const [engagementMetric, setEngagementMetric] = useState<EngagementMetric>("cvDownloads");
    const chartPoints = overview.timeline.map((point) => ({
        date: point.date,
        value: point[metric],
    }));

    return (
        <div className={styles.overview}>
            <section className={styles.stats} aria-label="Performance summary">
                <div className={styles.stat}>
                    <span className={styles.statIcon} aria-hidden="true">
                        <Eye size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.statLabel}>Project opens</span>
                    <strong className={styles.statValue}>
                        {formatNumber(overview.projectOpens)}
                    </strong>
                    <span className={styles.statMeta}>Portfolio engagement</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statIcon} aria-hidden="true">
                        <MessageSquareText size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.statLabel}>Contact starts</span>
                    <strong className={styles.statValue}>
                        {formatNumber(overview.contactStarts)}
                    </strong>
                    <span className={styles.statMeta}>Visitors who opened the form</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statIcon} aria-hidden="true">
                        <Send size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.statLabel}>Messages sent</span>
                    <strong className={styles.statValue}>{formatNumber(overview.contacts)}</strong>
                    <span className={styles.statMeta}>Successful contact submissions</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statIcon} aria-hidden="true">
                        <TrendingUp size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.statLabel}>Contact conversion</span>
                    <strong className={styles.statValue}>
                        {formatPercent(overview.contactConversionRate)}
                    </strong>
                    <span className={styles.statMeta}>Form starts converted to sends</span>
                </div>
            </section>

            <ReportTabs
                label="Analytics reports"
                tabs={[
                    {
                        id: "overview",
                        label: "Overview",
                        icon: <ChartNoAxesCombined />,
                        description:
                            "Follow activity over time and see which categories attract interest.",
                        content: (
                            <div className={styles.insightGrid}>
                                <section className={styles.chartCard}>
                                    <div className={styles.panelHeader}>
                                        <div>
                                            <p className={styles.eyebrow}>Activity</p>
                                            <h2 className={styles.panelTitle}>
                                                Performance over time
                                            </h2>
                                            <p className={styles.panelMeta}>
                                                {formatDateRange(overview.timeline)}
                                            </p>
                                        </div>
                                        <div
                                            className={styles.chartHeader}
                                            role="group"
                                            aria-label="Chart metric"
                                        >
                                            {METRICS.map((option) => (
                                                <button
                                                    key={option.value}
                                                    type="button"
                                                    className={cn(
                                                        styles.metricBtn,
                                                        metric === option.value &&
                                                            styles.metricBtnActive
                                                    )}
                                                    onClick={() => setMetric(option.value)}
                                                    aria-pressed={metric === option.value}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    <LineChart
                                        points={chartPoints}
                                        label={`${METRICS.find((option) => option.value === metric)?.label} over time`}
                                    />
                                </section>

                                <section className={styles.breakdown}>
                                    <div className={styles.panelHeaderCompact}>
                                        <div>
                                            <p className={styles.eyebrow}>Discovery</p>
                                            <h2 className={styles.panelTitle}>Category interest</h2>
                                        </div>
                                        <span className={styles.rowCount}>{categories.length}</span>
                                    </div>
                                    {categories.length === 0 ? (
                                        <p className={styles.muted}>
                                            No category interactions in this period.
                                        </p>
                                    ) : (
                                        <ol className={styles.breakdownList}>
                                            {categories.map((row, index) => (
                                                <li key={row.category}>
                                                    <div className={styles.breakdownRow}>
                                                        <span className={styles.rank}>
                                                            {String(index + 1).padStart(2, "0")}
                                                        </span>
                                                        <span className={styles.breakdownLabel}>
                                                            {categoryLabels[row.category] ??
                                                                row.category}
                                                        </span>
                                                        <strong>
                                                            {formatPercent(row.percent)}
                                                        </strong>
                                                    </div>
                                                    <span
                                                        className={styles.barTrack}
                                                        aria-hidden="true"
                                                    >
                                                        <span
                                                            className={styles.barFill}
                                                            style={
                                                                {
                                                                    "--bar-width": `${Math.min(row.percent * 100, 100)}%`,
                                                                } as CSSProperties
                                                            }
                                                        />
                                                    </span>
                                                </li>
                                            ))}
                                        </ol>
                                    )}
                                </section>
                            </div>
                        ),
                    },
                    {
                        id: "projects",
                        label: "Projects",
                        icon: <FolderKanban />,
                        description:
                            "Compare projects by opens, gallery views and visits to their websites.",
                        content: (
                            <section className={styles.projectsSection}>
                                <div className={styles.sectionHeader}>
                                    <div>
                                        <p className={styles.eyebrow}>Portfolio</p>
                                        <h2 className={styles.panelTitle}>Project performance</h2>
                                    </div>
                                    <span className={styles.sectionMeta}>
                                        {projects.length}{" "}
                                        {projects.length === 1 ? "project" : "projects"} with
                                        activity
                                    </span>
                                </div>
                                <TopProjectsTable
                                    projects={projects}
                                    projectNames={projectNames}
                                    days={days}
                                />
                            </section>
                        ),
                    },
                    {
                        id: "conversions",
                        label: "Conversions",
                        icon: <GitBranch />,
                        description:
                            "See how sessions progress from browsing to project visits and enquiries.",
                        content: sessions ? (
                            <ConversionFunnels sessions={sessions} />
                        ) : (
                            <p className={styles.muted}>Session data is currently unavailable.</p>
                        ),
                    },
                    {
                        id: "outbound",
                        label: "CV & socials",
                        icon: <Share2 />,
                        description: "Track CV downloads and interest in your social profiles.",
                        content: engagement ? (
                            <>
                                <div className={styles.engagementGrid}>
                                    <section className={cn(styles.breakdown, styles.cvCard)}>
                                        <div className={styles.panelHeaderCompact}>
                                            <div>
                                                <p className={styles.eyebrow}>Outbound interest</p>
                                                <h2 className={styles.panelTitle}>CV downloads</h2>
                                            </div>
                                            <span
                                                className={styles.statIconInline}
                                                aria-hidden="true"
                                            >
                                                <Download size={17} strokeWidth={1.8} />
                                            </span>
                                        </div>
                                        <strong className={styles.statValue}>
                                            {formatNumber(engagement.cvDownloads)}
                                        </strong>
                                        <span className={styles.statMeta}>
                                            Clicks on Download CV in the header and mobile menu
                                        </span>
                                        {!!engagement.cvLanguages?.length && (
                                            <ol
                                                className={styles.breakdownList}
                                                aria-label="CV downloads by language"
                                            >
                                                {engagement.cvLanguages.map((row) => (
                                                    <li key={row.entityId}>
                                                        <div className={styles.breakdownRow}>
                                                            <span className={styles.breakdownLabel}>
                                                                {cvLanguageName(row.entityId)}
                                                            </span>
                                                            <strong>
                                                                {formatNumber(row.count)} /{" "}
                                                                {formatPercent(row.percent)}
                                                            </strong>
                                                        </div>
                                                        <span
                                                            className={styles.barTrack}
                                                            aria-hidden="true"
                                                        >
                                                            <span
                                                                className={styles.barFill}
                                                                style={
                                                                    {
                                                                        "--bar-width": `${Math.min(row.percent * 100, 100)}%`,
                                                                    } as CSSProperties
                                                                }
                                                            />
                                                        </span>
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </section>

                                    <section className={styles.breakdown}>
                                        <div className={styles.panelHeaderCompact}>
                                            <div>
                                                <p className={styles.eyebrow}>Outbound interest</p>
                                                <h2 className={styles.panelTitle}>Social clicks</h2>
                                            </div>
                                            <span className={styles.rowCount}>
                                                {formatNumber(engagement.socialClicks)}
                                            </span>
                                        </div>
                                        {engagement.socials.length === 0 ? (
                                            <p className={styles.muted}>
                                                No social clicks in this period.
                                            </p>
                                        ) : (
                                            <ol className={styles.breakdownList}>
                                                {engagement.socials.map((row, index) => (
                                                    <li key={row.entityId}>
                                                        <div className={styles.breakdownRow}>
                                                            <span className={styles.rank}>
                                                                {String(index + 1).padStart(2, "0")}
                                                            </span>
                                                            <span className={styles.breakdownLabel}>
                                                                {socialName(row.entityId)}
                                                            </span>
                                                            <strong>
                                                                {formatNumber(row.count)} /{" "}
                                                                {formatPercent(row.percent)}
                                                            </strong>
                                                        </div>
                                                        <span
                                                            className={styles.barTrack}
                                                            aria-hidden="true"
                                                        >
                                                            <span
                                                                className={styles.barFill}
                                                                style={
                                                                    {
                                                                        "--bar-width": `${Math.min(row.percent * 100, 100)}%`,
                                                                    } as CSSProperties
                                                                }
                                                            />
                                                        </span>
                                                    </li>
                                                ))}
                                            </ol>
                                        )}
                                    </section>
                                </div>

                                {engagement.timeline && (
                                    <section className={cn(styles.chartCard, styles.trendCard)}>
                                        <div className={styles.panelHeader}>
                                            <div>
                                                <p className={styles.eyebrow}>Outbound interest</p>
                                                <h2 className={styles.panelTitle}>
                                                    CV and social trend
                                                </h2>
                                                <p className={styles.panelMeta}>
                                                    {days > WEEKLY_THRESHOLD_DAYS
                                                        ? "Weekly totals"
                                                        : "Daily totals"}
                                                </p>
                                            </div>
                                            <div
                                                className={styles.chartHeader}
                                                role="group"
                                                aria-label="Outbound metric"
                                            >
                                                {ENGAGEMENT_METRICS.map((option) => (
                                                    <button
                                                        key={option.value}
                                                        type="button"
                                                        className={cn(
                                                            styles.metricBtn,
                                                            engagementMetric === option.value &&
                                                                styles.metricBtnActive
                                                        )}
                                                        onClick={() =>
                                                            setEngagementMetric(option.value)
                                                        }
                                                        aria-pressed={
                                                            engagementMetric === option.value
                                                        }
                                                    >
                                                        {option.label}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                        <LineChart
                                            points={engagement.timeline.map((point) => ({
                                                date: point.date,
                                                value: point[engagementMetric],
                                            }))}
                                            label={`${ENGAGEMENT_METRICS.find((option) => option.value === engagementMetric)?.label} over time`}
                                        />
                                    </section>
                                )}
                            </>
                        ) : (
                            <p className={styles.muted}>
                                CV and social data is currently unavailable.
                            </p>
                        ),
                    },
                ]}
            />
        </div>
    );
}
