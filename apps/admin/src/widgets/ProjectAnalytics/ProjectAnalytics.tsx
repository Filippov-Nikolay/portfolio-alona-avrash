import { LineChart } from "@/shared/ui/LineChart";
import type { ProjectDetail } from "@/entities/analytics/model/types";
import type { CSSProperties } from "react";
import { Eye, Gauge, Images, MousePointerClick, TrendingUp } from "lucide-react";
import { CountryFlag } from "./CountryFlag";
import styles from "./ProjectAnalytics.module.css";

interface ProjectAnalyticsProps {
    detail: ProjectDetail;
}

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US").format(value);
}

function formatDateRange(points: ProjectDetail["timeline"]): string {
    if (points.length === 0) return "No activity recorded";
    const format = (date: string) =>
        new Date(date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            timeZone: "UTC",
        });
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

export function ProjectAnalytics({ detail }: ProjectAnalyticsProps) {
    return (
        <div className={styles.detail}>
            <section className={styles.stats} aria-label="Project performance summary">
                <div className={styles.stat}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Project opens</span>
                        <Eye
                            className={styles.statIcon}
                            size={17}
                            strokeWidth={1.8}
                            aria-hidden="true"
                        />
                    </div>
                    <strong className={styles.statValue}>{formatNumber(detail.opens)}</strong>
                    <span className={styles.statMeta}>Total project views</span>
                </div>
                <div className={styles.stat}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Website clicks</span>
                        <MousePointerClick
                            className={styles.statIcon}
                            size={17}
                            strokeWidth={1.8}
                            aria-hidden="true"
                        />
                    </div>
                    <strong className={styles.statValue}>
                        {formatNumber(detail.externalClicks)}
                    </strong>
                    <span className={styles.statMeta}>Visits to the external project</span>
                </div>
                <div className={styles.stat}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>External CTR</span>
                        <TrendingUp
                            className={styles.statIcon}
                            size={17}
                            strokeWidth={1.8}
                            aria-hidden="true"
                        />
                    </div>
                    <strong className={styles.statValue}>{formatPercent(detail.ctr)}</strong>
                    <span className={styles.statMeta}>Opens converted to website visits</span>
                </div>
                <div className={styles.stat}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Gallery views</span>
                        <Images
                            className={styles.statIcon}
                            size={17}
                            strokeWidth={1.8}
                            aria-hidden="true"
                        />
                    </div>
                    <strong className={styles.statValue}>
                        {formatNumber(detail.galleryViews)}
                    </strong>
                    <span className={styles.statMeta}>Visitors who explored the gallery</span>
                </div>
                <div className={styles.stat}>
                    <div className={styles.statHeader}>
                        <span className={styles.statLabel}>Gallery view rate</span>
                        <Gauge
                            className={styles.statIcon}
                            size={17}
                            strokeWidth={1.8}
                            aria-hidden="true"
                        />
                    </div>
                    <strong className={styles.statValue}>
                        {formatPercent(detail.galleryViewRate)}
                    </strong>
                    <span className={styles.statMeta}>Opens converted to gallery views</span>
                </div>
            </section>

            <section className={styles.chartCard}>
                <div className={styles.panelHeader}>
                    <div>
                        <p className={styles.eyebrow}>Activity</p>
                        <h2 className={styles.panelTitle}>Project opens over time</h2>
                    </div>
                    <span className={styles.dateRange}>{formatDateRange(detail.timeline)}</span>
                </div>
                <LineChart
                    points={detail.timeline.map((point) => ({
                        date: point.date,
                        value: point.count,
                    }))}
                    label="Project opens over time"
                    seriesLabel="Project opens"
                />
            </section>

            <div className={styles.breakdowns}>
                <section className={styles.breakdown}>
                    <div className={styles.breakdownHeader}>
                        <div>
                            <p className={styles.eyebrow}>Audience</p>
                            <h2 className={styles.panelTitle}>Top countries</h2>
                        </div>
                        <span className={styles.rowCount}>{detail.countries.length}</span>
                    </div>
                    {detail.countries.length === 0 ? (
                        <p className={styles.muted}>Not enough data yet.</p>
                    ) : (
                        <ol className={styles.breakdownList}>
                            {detail.countries.map((row, index) => (
                                <li key={row.country}>
                                    <div className={styles.breakdownRow}>
                                        <span className={styles.rank}>
                                            {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <span className={styles.breakdownIdentity}>
                                            <CountryFlag
                                                code={row.country}
                                                className={styles.countryFlag}
                                            />
                                            <span className={styles.breakdownLabel}>
                                                {countryName(row.country)}
                                            </span>
                                        </span>
                                        <strong>{formatPercent(row.percent)}</strong>
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

                <section className={styles.breakdown}>
                    <div className={styles.breakdownHeader}>
                        <div>
                            <p className={styles.eyebrow}>Audience</p>
                            <h2 className={styles.panelTitle}>Languages</h2>
                        </div>
                        <span className={styles.rowCount}>{detail.languages.length}</span>
                    </div>
                    {detail.languages.length === 0 ? (
                        <p className={styles.muted}>Not enough data yet.</p>
                    ) : (
                        <ol className={styles.breakdownList}>
                            {detail.languages.map((row, index) => (
                                <li key={row.locale}>
                                    <div className={styles.breakdownRow}>
                                        <span className={styles.rank}>
                                            {String(index + 1).padStart(2, "0")}
                                        </span>
                                        <span className={styles.breakdownIdentity}>
                                            <span className={styles.localeBadge} aria-hidden="true">
                                                {row.locale.split("-")[0]?.toUpperCase()}
                                            </span>
                                            <span className={styles.breakdownLabel}>
                                                {languageName(row.locale)}
                                            </span>
                                        </span>
                                        <strong>{formatPercent(row.percent)}</strong>
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
            </div>
        </div>
    );
}
