import { LineChart } from "@/shared/ui/LineChart";
import type { ProjectDetail } from "@/entities/analytics/model/types";
import styles from "./ProjectAnalytics.module.css";

interface ProjectAnalyticsProps {
    detail: ProjectDetail;
}

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

export function ProjectAnalytics({ detail }: ProjectAnalyticsProps) {
    return (
        <div>
            <div className={styles.stats}>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{detail.opens}</span>
                    <span className={styles.statLabel}>Project opens</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{detail.externalClicks}</span>
                    <span className={styles.statLabel}>External clicks</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{formatPercent(detail.ctr)}</span>
                    <span className={styles.statLabel}>External CTR</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>{detail.galleryViews}</span>
                    <span className={styles.statLabel}>Gallery views</span>
                </div>
                <div className={styles.stat}>
                    <span className={styles.statValue}>
                        {formatPercent(detail.galleryViewRate)}
                    </span>
                    <span className={styles.statLabel}>Gallery view rate</span>
                </div>
            </div>

            <div className={styles.chartCard}>
                <p className={styles.chartTitle}>Last {detail.timeline.length} days</p>
                <LineChart
                    points={detail.timeline.map((point) => ({
                        date: point.date,
                        value: point.count,
                    }))}
                />
            </div>

            <div className={styles.breakdowns}>
                <div className={styles.breakdown}>
                    <h2 className={styles.breakdownTitle}>Top countries</h2>
                    {detail.countries.length === 0 ? (
                        <p className={styles.muted}>Not enough data yet.</p>
                    ) : (
                        <ul className={styles.breakdownList}>
                            {detail.countries.map((row) => (
                                <li key={row.country}>
                                    <span>{row.country}</span>
                                    <span>{formatPercent(row.percent)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                <div className={styles.breakdown}>
                    <h2 className={styles.breakdownTitle}>Languages</h2>
                    {detail.languages.length === 0 ? (
                        <p className={styles.muted}>Not enough data yet.</p>
                    ) : (
                        <ul className={styles.breakdownList}>
                            {detail.languages.map((row) => (
                                <li key={row.locale}>
                                    <span>{row.locale.toUpperCase()}</span>
                                    <span>{formatPercent(row.percent)}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
            </div>
        </div>
    );
}
