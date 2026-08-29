import { m } from "framer-motion";
import { Skeleton } from "@/shared/ui";
import sectionStyles from "./FeaturesSection.module.scss";
import styles from "./FeaturesSkeleton.module.scss";

const ARCH_TAG_WIDTHS = [68, 88, 62, 80, 56, 92] as const;

const SKILL_ITEM_WIDTHS = [48, 70, 54, 82, 42, 66] as const;

const EASE = [0.4, 0, 0.2, 1] as const;

const skContainer = {
    hidden: {},
    show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const skBar = {
    hidden: { opacity: 0, y: 6 },
    show: { opacity: 1, y: 0, transition: { duration: 0.32, ease: EASE } },
};

export function ArchCardSkeleton() {
    return (
        <div className={sectionStyles.archCard}>
            <m.div
                className={sectionStyles.archContent}
                variants={skContainer}
                initial="hidden"
                animate="show"
            >
                <m.div variants={skBar}>
                    <Skeleton accent width={40} height={40} className={styles.iconBox} />
                </m.div>
                <m.div variants={skBar}>
                    <Skeleton accent height={26} className={styles.titleBar} />
                </m.div>
                <m.div variants={skBar} className={styles.textLines}>
                    <Skeleton height={13} />
                    <Skeleton height={13} width="80%" />
                    <Skeleton height={13} width="52%" />
                </m.div>
                <m.div variants={skBar} className={styles.tagRow}>
                    {ARCH_TAG_WIDTHS.map((w, i) => (
                        <Skeleton key={i} rounded width={w} height={26} />
                    ))}
                </m.div>
            </m.div>
            <div className={sectionStyles.archIllustration} />
        </div>
    );
}

export function SkillCardSkeleton() {
    return (
        <m.div
            className={sectionStyles.skillCard}
            variants={skContainer}
            initial="hidden"
            animate="show"
        >
            <m.div variants={skBar} className={sectionStyles.skillHeader}>
                <Skeleton accent width={40} height={40} className={styles.iconBox} />
                <Skeleton accent height={20} className={styles.titleBar} />
            </m.div>
            <m.div variants={skBar} className={styles.skillItems}>
                {SKILL_ITEM_WIDTHS.map((w, i) => (
                    <div key={i} className={styles.skillItem}>
                        <span className={sectionStyles.skillBullet} aria-hidden="true" />
                        <Skeleton height={13} width={w} />
                    </div>
                ))}
            </m.div>
        </m.div>
    );
}

export function SkillGridSkeleton() {
    return (
        <div className={sectionStyles.skillGrid}>
            {Array.from({ length: 4 }).map((_, i) => (
                <div key={i}>
                    <SkillCardSkeleton />
                </div>
            ))}
        </div>
    );
}
