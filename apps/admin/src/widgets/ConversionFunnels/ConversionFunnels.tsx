import type { CSSProperties } from "react";
import type { FunnelStep, SessionsSummary } from "@/entities/analytics/model/types";
import styles from "./ConversionFunnels.module.css";

interface StepCopy {
    label: string;
    baseLabel?: string;
}

const STEP_COPY: Record<string, StepCopy> = {
    sessions: { label: "Sessions" },
    project_open: { label: "Opened a project" },
    project_gallery_view: { label: "Viewed a gallery", baseLabel: "project openers" },
    project_external_click: { label: "Visited a project link", baseLabel: "project openers" },
    contact_started: { label: "Started the contact form" },
    contact_success: { label: "Sent a message", baseLabel: "form starters" },
};

interface ConversionFunnelsProps {
    sessions: SessionsSummary;
}

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US").format(value);
}

function stepMeta(step: FunnelStep, index: number): string {
    if (index === 0) return "Visits with at least one page view";
    const copy = STEP_COPY[step.key];
    const share = `${formatPercent(step.ofSessions)} of sessions`;
    return copy?.baseLabel
        ? `${share} · ${formatPercent(step.ofBase)} of ${copy.baseLabel}`
        : share;
}

interface FunnelProps {
    eyebrow: string;
    title: string;
    steps: FunnelStep[];
}

function Funnel({ eyebrow, title, steps }: FunnelProps) {
    const conversion = steps.at(-1)?.ofSessions ?? 0;

    return (
        <section className={styles.funnel}>
            <div className={styles.header}>
                <div>
                    <p className={styles.eyebrow}>{eyebrow}</p>
                    <h2 className={styles.title}>{title}</h2>
                </div>
                <span className={styles.conversion}>
                    <strong>{formatPercent(conversion)}</strong>
                    <span>end to end</span>
                </span>
            </div>
            <ol className={styles.steps}>
                {steps.map((step, index) => (
                    <li key={step.key} className={styles.step}>
                        <div className={styles.stepRow}>
                            <span className={styles.stepIndex}>{index + 1}</span>
                            <span className={styles.stepLabel}>
                                {STEP_COPY[step.key]?.label ?? step.key}
                            </span>
                            <strong className={styles.stepValue}>
                                {formatNumber(step.sessions)}
                            </strong>
                        </div>
                        <span className={styles.track} aria-hidden="true">
                            <span
                                className={styles.fill}
                                style={
                                    {
                                        "--bar-width": `${Math.min(step.ofSessions * 100, 100)}%`,
                                    } as CSSProperties
                                }
                            />
                        </span>
                        <span className={styles.stepMeta}>{stepMeta(step, index)}</span>
                    </li>
                ))}
            </ol>
        </section>
    );
}

export function ConversionFunnels({ sessions }: ConversionFunnelsProps) {
    return (
        <div className={styles.wrap}>
            <div className={styles.grid}>
                <Funnel
                    eyebrow="Portfolio journey"
                    title="From visit to project link"
                    steps={sessions.projectFunnel}
                />
                <Funnel
                    eyebrow="Contact journey"
                    title="From visit to message"
                    steps={sessions.contactFunnel}
                />
            </div>
            <p className={styles.note}>
                Counted per session - one visit in one browser tab - and only for visitors who
                allowed analytics.
            </p>
        </div>
    );
}
