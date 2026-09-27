"use client";

import { useState, type CSSProperties, type ReactNode } from "react";
import { Activity, Eye, Files, Layers, LogOut, Smartphone, Timer, Users } from "lucide-react";
import { LineChart } from "@/shared/ui/LineChart";
import { cn } from "@/shared/lib/cn";
import { CountryFlag } from "@/widgets/ProjectAnalytics/CountryFlag";
import type {
    SessionsSummary,
    ShareBreakdown,
    TrafficOverview as TrafficOverviewData,
} from "@/entities/analytics/model/types";
import styles from "./TrafficOverview.module.css";

type Metric = "visitors" | "sessions" | "pageViews";

const METRICS: { value: Metric; label: string }[] = [
    { value: "visitors", label: "Visitors" },
    { value: "sessions", label: "Sessions" },
    { value: "pageViews", label: "Page views" },
];

const DEVICE_LABELS: Record<string, string> = {
    mobile: "Mobile",
    tablet: "Tablet",
    desktop: "Desktop",
};

interface TrafficOverviewProps {
    traffic: TrafficOverviewData;
    sessions: SessionsSummary | null;
}

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US").format(value);
}

function formatRatio(value: number): string {
    return value.toFixed(2);
}

function formatDuration(ms: number | null): string {
    if (ms === null) return "-";
    if (ms < 1000) return "<1s";
    const totalSeconds = Math.round(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return minutes > 0 ? `${minutes}m ${String(seconds).padStart(2, "0")}s` : `${seconds}s`;
}

function formatDateRange(points: TrafficOverviewData["timeline"]): string {
    if (points.length === 0) return "No activity recorded";
    const format = (date: string) =>
        new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return `${format(points[0]!.date)} - ${format(points.at(-1)!.date)}`;
}

function countryName(code: string): string {
    try {
        return new Intl.DisplayNames(["en"], { type: "region" }).of(code.toUpperCase()) ?? code;
    } catch {
        return code;
    }
}

function languageName(locale: string): string {
    try {
        return (
            new Intl.DisplayNames(["en"], { type: "language" }).of(locale) ?? locale.toUpperCase()
        );
    } catch {
        return locale.toUpperCase();
    }
}

interface BreakdownPanelProps {
    eyebrow: string;
    title: string;
    rows: ShareBreakdown[];
    renderLabel?: (key: string) => ReactNode;
}

function BreakdownPanel({ eyebrow, title, rows, renderLabel }: BreakdownPanelProps) {
    return (
        <section className={styles.panel}>
            <div className={styles.panelHeaderCompact}>
                <div>
                    <p className={styles.eyebrow}>{eyebrow}</p>
                    <h2 className={styles.panelTitle}>{title}</h2>
                </div>
                <span className={styles.rowCount}>{rows.length}</span>
            </div>
            {rows.length === 0 ? (
                <p className={styles.muted}>Not enough data yet.</p>
            ) : (
                <ol className={styles.breakdownList}>
                    {rows.map((row, index) => (
                        <li key={row.key}>
                            <div className={styles.breakdownRow}>
                                <span className={styles.rank}>
                                    {String(index + 1).padStart(2, "0")}
                                </span>
                                <span className={styles.breakdownLabel}>
                                    {renderLabel ? renderLabel(row.key) : row.key}
                                </span>
                                <span className={styles.breakdownValue}>
                                    <strong>{formatPercent(row.percent)}</strong>
                                    <span>{formatNumber(row.visitors)}</span>
                                </span>
                            </div>
                            <span className={styles.barTrack} aria-hidden="true">
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
    );
}

function SessionStats({ sessions }: { sessions: SessionsSummary }) {
    return (
        <section className={cn(styles.stats, styles.sessionStats)} aria-label="Session summary">
            <div className={styles.stat}>
                <span className={styles.statIcon} aria-hidden="true">
                    <Activity size={17} strokeWidth={1.8} />
                </span>
                <span className={styles.statLabel}>Sessions</span>
                <strong className={styles.statValue}>{formatNumber(sessions.sessions)}</strong>
                <span className={styles.statMeta}>
                    {formatRatio(sessions.eventsPerSession)} tracked events per session
                </span>
            </div>
            <div className={styles.stat}>
                <span className={styles.statIcon} aria-hidden="true">
                    <Files size={17} strokeWidth={1.8} />
                </span>
                <span className={styles.statLabel}>Pages per session</span>
                <strong className={styles.statValue}>
                    {formatRatio(sessions.pagesPerSession)}
                </strong>
                <span className={styles.statMeta}>Pages opened in one visit</span>
            </div>
            <div className={styles.stat}>
                <span className={styles.statIcon} aria-hidden="true">
                    <LogOut size={17} strokeWidth={1.8} />
                </span>
                <span className={styles.statLabel}>Single-page sessions</span>
                <strong className={styles.statValue}>{formatPercent(sessions.bounceRate)}</strong>
                <span className={styles.statMeta}>Visits that ended on the first page</span>
            </div>
            <div className={styles.stat}>
                <span className={styles.statIcon} aria-hidden="true">
                    <Timer size={17} strokeWidth={1.8} />
                </span>
                <span className={styles.statLabel}>Median session</span>
                <strong className={styles.statValue}>
                    {formatDuration(sessions.medianDurationMs)}
                </strong>
                <span className={styles.statMeta}>First to last event, visits with 2+ pages</span>
            </div>
        </section>
    );
}

function CampaignsPanel({ campaigns }: { campaigns: TrafficOverviewData["campaigns"] }) {
    return (
        <section className={cn(styles.panel, styles.pagesPanel)}>
            <div className={styles.sectionHeader}>
                <div>
                    <p className={styles.eyebrow}>Acquisition</p>
                    <h2 className={styles.panelTitle}>Campaigns</h2>
                </div>
                <span className={styles.sectionMeta}>From UTM-tagged links</span>
            </div>
            {campaigns.length === 0 ? (
                <p className={styles.muted}>
                    No tagged visits yet. Add utm_source, utm_medium, utm_campaign or utm_content to
                    the links you share.
                </p>
            ) : (
                <div className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Source</th>
                                <th>Medium</th>
                                <th>Campaign</th>
                                <th>Content</th>
                                <th className={styles.numCol}>Sessions</th>
                                <th className={styles.numCol}>Visitors</th>
                                <th className={styles.numCol}>Share</th>
                            </tr>
                        </thead>
                        <tbody>
                            {campaigns.map((row) => (
                                <tr
                                    key={[row.source, row.medium, row.campaign, row.content].join(
                                        "|"
                                    )}
                                >
                                    <td className={styles.pathCell}>{row.source ?? "-"}</td>
                                    <td className={styles.pathCell}>{row.medium ?? "-"}</td>
                                    <td className={styles.pathCell}>{row.campaign ?? "-"}</td>
                                    <td className={styles.pathCell}>{row.content ?? "-"}</td>
                                    <td className={styles.numCol}>{formatNumber(row.sessions)}</td>
                                    <td className={styles.numCol}>{formatNumber(row.visitors)}</td>
                                    <td className={styles.numCol}>{formatPercent(row.percent)}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </section>
    );
}

export function TrafficOverview({ traffic, sessions }: TrafficOverviewProps) {
    const [metric, setMetric] = useState<Metric>("visitors");
    const mobileShare = traffic.devices.find((row) => row.key === "mobile")?.percent ?? 0;
    const maxViews = Math.max(...traffic.pages.map((page) => page.views), 1);

    return (
        <div className={styles.overview}>
            <section className={styles.stats} aria-label="Traffic summary">
                <div className={styles.stat}>
                    <span className={styles.statIcon} aria-hidden="true">
                        <Users size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.statLabel}>Visitors</span>
                    <strong className={styles.statValue}>{formatNumber(traffic.visitors)}</strong>
                    <span className={styles.statMeta}>Unique visitors per day, summed</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statIcon} aria-hidden="true">
                        <Eye size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.statLabel}>Page views</span>
                    <strong className={styles.statValue}>{formatNumber(traffic.pageViews)}</strong>
                    <span className={styles.statMeta}>Every page and project opened</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statIcon} aria-hidden="true">
                        <Layers size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.statLabel}>Views per visitor</span>
                    <strong className={styles.statValue}>
                        {formatRatio(traffic.viewsPerVisitor)}
                    </strong>
                    <span className={styles.statMeta}>Average depth of a visit</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statIcon} aria-hidden="true">
                        <Smartphone size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.statLabel}>Mobile visitors</span>
                    <strong className={styles.statValue}>{formatPercent(mobileShare)}</strong>
                    <span className={styles.statMeta}>Share of visitors on phones</span>
                </div>
            </section>

            {sessions && <SessionStats sessions={sessions} />}

            <p className={styles.note}>Only visitors who allowed analytics are counted.</p>

            <section className={cn(styles.panel, styles.chartCard)}>
                <div className={styles.panelHeader}>
                    <div>
                        <p className={styles.eyebrow}>Activity</p>
                        <h2 className={styles.panelTitle}>Traffic over time</h2>
                        <p className={styles.panelMeta}>{formatDateRange(traffic.timeline)}</p>
                    </div>
                    <div className={styles.chartHeader} role="group" aria-label="Chart metric">
                        {METRICS.map((option) => (
                            <button
                                key={option.value}
                                type="button"
                                className={cn(
                                    styles.metricBtn,
                                    metric === option.value && styles.metricBtnActive
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
                    points={traffic.timeline.map((point) => ({
                        date: point.date,
                        value: point[metric] ?? 0,
                    }))}
                    label={`${METRICS.find((option) => option.value === metric)?.label} over time`}
                />
            </section>

            <section className={cn(styles.panel, styles.pagesPanel)}>
                <div className={styles.sectionHeader}>
                    <div>
                        <p className={styles.eyebrow}>Content</p>
                        <h2 className={styles.panelTitle}>Pages</h2>
                    </div>
                    <span className={styles.sectionMeta}>
                        {traffic.pages.length} {traffic.pages.length === 1 ? "page" : "pages"}{" "}
                        viewed
                    </span>
                </div>
                {traffic.pages.length === 0 ? (
                    <p className={styles.muted}>No page views in this period.</p>
                ) : (
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Page</th>
                                    <th className={styles.numCol}>Views</th>
                                    <th className={styles.shareCol}>Share of views</th>
                                    <th className={styles.numCol}>Visitors</th>
                                </tr>
                            </thead>
                            <tbody>
                                {traffic.pages.map((page) => (
                                    <tr key={page.path}>
                                        <td className={styles.pathCell} title={page.path}>
                                            {page.path}
                                        </td>
                                        <td className={styles.numCol}>
                                            {formatNumber(page.views)}
                                        </td>
                                        <td className={styles.shareCol}>
                                            <span className={styles.shareCell}>
                                                <span className={styles.shareTrack}>
                                                    <span
                                                        className={styles.barFill}
                                                        style={
                                                            {
                                                                "--bar-width": `${(page.views / maxViews) * 100}%`,
                                                            } as CSSProperties
                                                        }
                                                    />
                                                </span>
                                                <strong>{formatPercent(page.percent)}</strong>
                                            </span>
                                        </td>
                                        <td className={styles.numCol}>
                                            {formatNumber(page.visitors)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>

            {traffic.campaigns && <CampaignsPanel campaigns={traffic.campaigns} />}

            <div className={styles.breakdowns}>
                <BreakdownPanel
                    eyebrow="Audience"
                    title="Countries"
                    rows={traffic.countries}
                    renderLabel={(key) =>
                        key === "Unknown" ? (
                            key
                        ) : (
                            <span className={styles.identity}>
                                <CountryFlag code={key} className={styles.flag} />
                                {countryName(key)}
                            </span>
                        )
                    }
                />
                <BreakdownPanel
                    eyebrow="Audience"
                    title="Languages"
                    rows={traffic.languages}
                    renderLabel={languageName}
                />
                <BreakdownPanel eyebrow="Acquisition" title="Referrers" rows={traffic.referrers} />
                <BreakdownPanel
                    eyebrow="Technology"
                    title="Devices"
                    rows={traffic.devices}
                    renderLabel={(key) => DEVICE_LABELS[key] ?? key}
                />
                <BreakdownPanel
                    eyebrow="Technology"
                    title="Operating systems"
                    rows={traffic.operatingSystems}
                />
                <BreakdownPanel eyebrow="Technology" title="Browsers" rows={traffic.browsers} />
            </div>
        </div>
    );
}
