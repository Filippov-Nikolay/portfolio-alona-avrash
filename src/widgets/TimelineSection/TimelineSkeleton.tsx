import { Container, Section, Skeleton } from "@/shared/ui";
import sectionStyles from "./TimelineSection.module.scss";

const ENTRY_COUNT = 3;
const TAG_WIDTHS = [56, 72, 64] as const;

function EntrySkeleton() {
    return (
        <div className={sectionStyles.entry}>
            <div className={sectionStyles.entryLeft}>
                <div className={sectionStyles.dotOuter} aria-hidden="true">
                    <div className={sectionStyles.dot} />
                </div>
            </div>

            <article className={sectionStyles.card}>
                <div className={sectionStyles.cardBody}>
                    <div className={sectionStyles.cardMain}>
                        <div className={sectionStyles.cardHead}>
                            <Skeleton accent width={56} height={56} rounded />
                            <div className={sectionStyles.cardInfo}>
                                <Skeleton accent width={180} height={18} />
                                <Skeleton width={120} height={13} />
                            </div>
                        </div>
                        <Skeleton height={13} />
                        <Skeleton height={13} width="70%" />
                    </div>

                    <ul className={sectionStyles.cardTags} aria-hidden="true">
                        {TAG_WIDTHS.map((w, i) => (
                            <li key={i}>
                                <Skeleton rounded width={w} height={24} />
                            </li>
                        ))}
                    </ul>
                </div>
            </article>
        </div>
    );
}

// Mirrors TimelineSectionClient's layout so the swap-in on load has zero
// shift. Used as the <Suspense> fallback for the async TimelineSection.
export function TimelineSkeleton() {
    return (
        <Section className={sectionStyles.section}>
            <Container>
                <div className={sectionStyles.header}>
                    <Skeleton accent width={220} height={34} />
                    <Skeleton width={260} height={14} />
                </div>

                <div className={sectionStyles.timeline}>
                    {Array.from({ length: ENTRY_COUNT }, (_, i) => (
                        <EntrySkeleton key={i} />
                    ))}
                </div>
            </Container>
        </Section>
    );
}

TimelineSkeleton.displayName = "TimelineSkeleton";
