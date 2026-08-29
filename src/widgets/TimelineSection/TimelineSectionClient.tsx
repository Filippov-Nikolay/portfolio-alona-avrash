"use client";

import { useLocale } from "next-intl";
import type { TimelineData, TimelineIcon as TimelineIconType } from "@/shared/types";
import { usePreloader } from "@/shared/providers";
import {
    CodeV2Icon,
    Container,
    DatabaseIcon,
    MonitorIcon,
    PromptIcon,
    Section,
    SectionHeader,
    StackIcon,
    Tag,
} from "@/shared/ui";
import { useTimelineSectionAnimations } from "./useTimelineSectionAnimations";
import styles from "./TimelineSection.module.scss";

const LOGO_ICONS = {
    stack: StackIcon,
    codeV2: CodeV2Icon,
    database: DatabaseIcon,
    prompt: PromptIcon,
    monitor: MonitorIcon,
} satisfies Record<TimelineIconType, typeof StackIcon>;

interface TimelineSectionProps {
    initialData: TimelineData;
}

export function TimelineSectionClient({ initialData }: TimelineSectionProps) {
    const locale = useLocale();
    return <TimelineSectionContent key={locale} initialData={initialData} />;
}

function TimelineSectionContent({ initialData }: TimelineSectionProps) {
    const locale = useLocale();
    const i18n = initialData.i18n[locale] ?? initialData.i18n.en;
    const { isReady } = usePreloader();

    const { sectionRef, headerRef, terminalWrapRef, subtitleRef, timelineLineRef, setEntryRef } =
        useTimelineSectionAnimations(initialData.entries.length, isReady);

    return (
        <Section id="timeline" className={styles.section}>
            <Container>
                <div ref={sectionRef}>
                    {/* === Header === */}
                    <div ref={headerRef} className={styles.header}>
                        <SectionHeader ref={terminalWrapRef} title="TIMELINE" />
                        <p ref={subtitleRef} className={styles.subtitle}>
                            {i18n.subtitle}
                        </p>
                    </div>

                    {/* === Timeline === */}
                    <div className={styles.timeline}>
                        <div
                            ref={timelineLineRef}
                            className={styles.timelineTrack}
                            aria-hidden="true"
                        />

                        {initialData.entries.map((entry, i) => {
                            const subtitle = entry.subtitle[locale] ?? entry.subtitle.en;
                            const meta = entry.meta[locale] ?? entry.meta.en;
                            const description = entry.description[locale] ?? entry.description.en;
                            const endDate = entry.endDate ?? i18n.present;
                            const LogoIcon = LOGO_ICONS[entry.icon];

                            return (
                                <div key={entry.id} ref={setEntryRef(i)} className={styles.entry}>
                                    {/* --- Left col: dates + dot --- */}
                                    <div className={styles.entryLeft}>
                                        <div className={styles.dates} data-timeline-dates>
                                            <span className={styles.dateStart}>
                                                {entry.startDate}
                                            </span>
                                            <span className={styles.dateEnd}>{endDate}</span>
                                        </div>
                                        <div
                                            className={styles.dotOuter}
                                            data-timeline-dot
                                            aria-hidden="true"
                                        >
                                            <div className={styles.dot} />
                                        </div>
                                    </div>

                                    {/* --- Right col: card --- */}
                                    <article className={styles.card} data-timeline-card>
                                        {/* Dates shown only on mobile (inside card) */}
                                        <div className={styles.mobileDates} aria-hidden="true">
                                            <span className={styles.mobileDateText}>
                                                {entry.startDate}
                                            </span>
                                            <span className={styles.mobileDateSep}>—</span>
                                            <span className={styles.mobileDateText}>{endDate}</span>
                                        </div>

                                        <div className={styles.cardBody}>
                                            {/* Main content column */}
                                            <div className={styles.cardMain}>
                                                <div className={styles.cardHead}>
                                                    <div
                                                        className={styles.logo}
                                                        style={{
                                                            backgroundColor: `${entry.color}14`,
                                                            borderColor: `${entry.color}30`,
                                                            color: entry.color,
                                                        }}
                                                        aria-hidden="true"
                                                    >
                                                        <LogoIcon className={styles.logoIcon} />
                                                    </div>
                                                    <div className={styles.cardInfo}>
                                                        <h3 className={styles.cardRole}>
                                                            {entry.title}
                                                            <span
                                                                className={styles.cardRoleHighlight}
                                                            >
                                                                {" — "}
                                                                {subtitle}
                                                            </span>
                                                        </h3>
                                                        <p className={styles.cardMeta}>{meta}</p>
                                                    </div>
                                                </div>
                                                <p className={styles.cardDesc}>{description}</p>
                                            </div>

                                            {/* Tags column */}
                                            <ul
                                                className={styles.cardTags}
                                                aria-label="Tags"
                                                data-timeline-tags
                                            >
                                                {entry.tags.map((tag) => (
                                                    <li key={tag}>
                                                        <Tag className={styles.tag}>{tag}</Tag>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </article>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </Container>
        </Section>
    );
}
