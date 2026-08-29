"use client";

import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useLocale } from "next-intl";
import type { FeaturesData, FeatureGroupIcon } from "@/shared/types";
import { usePreloader } from "@/shared/providers";
import {
    AiIDEIcon,
    CodeV2Icon,
    Container,
    DatabaseIcon,
    MonitorIcon,
    PromptIcon,
    Section,
    SectionHeader,
    StackIcon,
    TagList,
} from "@/shared/ui";
import { useFeaturesSectionAnimations } from "./useFeaturesSectionAnimations";
import { ArchCardSkeleton, SkillGridSkeleton } from "./FeaturesSkeleton";
import { FoundationIllustration } from "./FoundationIllustration";
import styles from "./FeaturesSection.module.scss";

const ARCH_IN_VIEW_OPTIONS = {
    once: true,
    amount: 0.32,
    margin: "0px 0px -28% 0px",
} as const;
const SKILL_GRID_IN_VIEW_OPTIONS = {
    once: true,
    amount: 0.18,
    margin: "0px 0px -22% 0px",
} as const;

// Minimum skeleton display time in ms — change here
const SKELETON_DELAY_MS = 500;

const GROUP_ICONS = {
    monitor: MonitorIcon,
    codeV2: CodeV2Icon,
    database: DatabaseIcon,
    prompt: PromptIcon,
    AiIDE: AiIDEIcon,
} satisfies Record<FeatureGroupIcon, typeof MonitorIcon>;

interface FeaturesSectionProps {
    initialData: FeaturesData;
}

function IntroText({ text, className }: { text: string; className: string }) {
    const parts = text.split(/(\*\*[^*]+\*\*)/g);
    return (
        <p className={className}>
            {parts.map((part, i) =>
                part.startsWith("**") && part.endsWith("**") ? (
                    <span key={i} className={styles.bioHighlight}>
                        {part.slice(2, -2)}
                    </span>
                ) : (
                    part
                )
            )}
        </p>
    );
}

export function FeaturesSection({ initialData }: FeaturesSectionProps) {
    const locale = useLocale();

    return <FeaturesSectionContent key={locale} initialData={initialData} />;
}

function FeaturesSectionContent({ initialData }: FeaturesSectionProps) {
    const locale = useLocale();
    const i18n = initialData.i18n[locale] ?? initialData.i18n.en;
    const { isReady } = usePreloader();
    const archDelayStartedRef = useRef(false);
    const archDelayTimerRef = useRef<number | null>(null);
    const skillsDelayStartedRef = useRef(false);
    const skillsDelayTimerRef = useRef<number | null>(null);
    const [isArchDelayDone, setIsArchDelayDone] = useState(false);
    const [isSkillsDelayDone, setIsSkillsDelayDone] = useState(false);
    const {
        sectionRef,
        headerRef,
        headerLeadRef,
        headerBioRef,
        archRef,
        archIllustrationRef,
        skillGridRef,
        setSkillCardRef,
    } = useFeaturesSectionAnimations(initialData.groups.length, isSkillsDelayDone, isReady);
    const isArchInView = useInView(archRef, ARCH_IN_VIEW_OPTIONS);
    const isSkillGridInView = useInView(skillGridRef, SKILL_GRID_IN_VIEW_OPTIONS);
    const isArchLoading = !isArchDelayDone;
    const isSkillsLoading = !isSkillsDelayDone;

    useEffect(() => {
        return () => {
            if (archDelayTimerRef.current !== null) {
                window.clearTimeout(archDelayTimerRef.current);
            }

            if (skillsDelayTimerRef.current !== null) {
                window.clearTimeout(skillsDelayTimerRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!isArchInView || archDelayStartedRef.current) {
            return;
        }

        archDelayStartedRef.current = true;
        archDelayTimerRef.current = window.setTimeout(() => {
            setIsArchDelayDone(true);
        }, SKELETON_DELAY_MS);
    }, [isArchInView]);

    useEffect(() => {
        if (!isSkillGridInView || skillsDelayStartedRef.current) {
            return;
        }

        skillsDelayStartedRef.current = true;
        skillsDelayTimerRef.current = window.setTimeout(() => {
            setIsSkillsDelayDone(true);
        }, SKELETON_DELAY_MS);
    }, [isSkillGridInView]);

    return (
        <Section id="features" className={styles.section}>
            <Container>
                <div ref={sectionRef}>
                    <div ref={headerRef} className={styles.header}>
                        <SectionHeader ref={headerLeadRef} title="CAPABILITIES" />

                        <div ref={headerBioRef} className={styles.bio}>
                            <IntroText text={i18n.intro} className={styles.bioText} />
                            <p className={styles.bioExp}>{i18n.highlight}</p>
                            <div className={styles.available}>
                                <span className={styles.availableDot} aria-hidden="true" />
                                <span>{i18n.status}</span>
                            </div>
                        </div>
                    </div>

                    <div ref={archRef} className={styles.archSlot}>
                        {isArchLoading ? (
                            <ArchCardSkeleton />
                        ) : (
                            <div className={styles.archCard}>
                                <div className={styles.archContent}>
                                    <div className={styles.skillIcon} aria-hidden="true">
                                        <StackIcon />
                                    </div>
                                    <h3 className={styles.archTitle}>
                                        {i18n.highlightTitle}{" "}
                                        <span className={styles.archHighlight}>
                                            {i18n.highlightAccent}
                                        </span>
                                    </h3>
                                    <p className={styles.archDesc}>{i18n.highlightDesc}</p>
                                    <TagList
                                        tags={initialData.highlightTags}
                                        variant="default"
                                        tagClassName={styles.archTag}
                                    />
                                </div>

                                <div
                                    ref={archIllustrationRef}
                                    className={styles.archIllustration}
                                    aria-hidden="true"
                                >
                                    <FoundationIllustration />
                                </div>
                            </div>
                        )}
                    </div>

                    <div ref={skillGridRef} className={styles.skillGridSlot}>
                        {isSkillsLoading ? (
                            <SkillGridSkeleton />
                        ) : (
                            <div className={styles.skillGrid}>
                                {initialData.groups.map(
                                    ({ id, prefix, suffix, icon, items }, index) => {
                                        const Icon = GROUP_ICONS[icon];

                                        return (
                                            <div key={id}>
                                                <div
                                                    ref={setSkillCardRef(index)}
                                                    className={styles.skillCard}
                                                >
                                                    <div className={styles.skillHeader}>
                                                        <div
                                                            className={styles.skillIcon}
                                                            aria-hidden="true"
                                                        >
                                                            <Icon />
                                                        </div>
                                                        <h4 className={styles.skillTitle}>
                                                            {prefix}
                                                            <span className={styles.skillSuffix}>
                                                                {suffix}
                                                            </span>
                                                        </h4>
                                                    </div>
                                                    <ul
                                                        className={styles.skillList}
                                                        aria-label={`${prefix}${suffix} capabilities`}
                                                    >
                                                        {items.map((item) => (
                                                            <li
                                                                key={item}
                                                                className={styles.skillItem}
                                                            >
                                                                <span
                                                                    className={styles.skillBullet}
                                                                    aria-hidden="true"
                                                                />
                                                                {item}
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        );
                                    }
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </Container>
        </Section>
    );
}
