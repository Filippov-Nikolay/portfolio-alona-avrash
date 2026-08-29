"use client";

import { m } from "framer-motion";
import { useTranslations } from "next-intl";
import {
    Container,
    Section,
    GridOverlay,
    NoiseLayer,
    ArrowIcon,
    GitHubIcon,
    LinkedInIcon,
    TelegramIcon,
} from "@/shared/ui";
import { siteConfig } from "@/shared/config/site.config";
import { useMotionVariants } from "@/shared/hooks/useMotionVariants";
import { staggerContainer } from "@/shared/lib/motion/stagger";
import { fadeIn } from "@/shared/lib/motion/fade-in";
import { scrollToElementId } from "@/shared/lib/scroll";
import { usePreloader } from "@/shared/providers";
import styles from "./HeroSection.module.scss";

const LINKS_LEFT = [{ key: "github", href: siteConfig.links.github, Icon: GitHubIcon }] as const;

const LINKS_RIGHT = [
    { key: "telegram", href: siteConfig.links.telegram, Icon: TelegramIcon },
    { key: "linkedin", href: siteConfig.links.linkedin, Icon: LinkedInIcon },
    // { key: "instagram", href: siteConfig.links.instagram, Icon: InstagramIcon },
] as const;

function handleCtaClick(e: React.MouseEvent) {
    e.preventDefault();
    scrollToElementId("showcase", { offset: 100 });
}

export function HeroSection() {
    const t = useTranslations("hero");
    const safeStagger = useMotionVariants(staggerContainer);
    const safeFadeIn = useMotionVariants(fadeIn);
    const { isReady } = usePreloader();

    return (
        <Section className={styles.hero}>
            <GridOverlay />
            <NoiseLayer />
            <div className={styles.glow} aria-hidden="true" />

            <Container>
                <m.div
                    className={styles.content}
                    variants={safeStagger}
                    initial="hidden"
                    animate={isReady ? "visible" : "hidden"}
                >
                    {/* Heading block */}
                    <m.div className={styles.headingArea} variants={safeFadeIn}>
                        <div className={styles.firstLine}>
                            <span className={styles.displayText}>{t("line1")}</span>

                            <a href="#showcase" className={styles.ctaBtn} onClick={handleCtaClick}>
                                <span className={styles.ctaText}>{t("ctaLabel")}</span>
                                <span className={styles.ctaCircle} aria-hidden="true">
                                    <ArrowIcon className={styles.ctaArrow} />
                                </span>
                            </a>
                        </div>

                        <h1 className={styles.displayText}>
                            {t.rich("line2", {
                                accent: (chunks) => <span className={styles.accent}>{chunks}</span>,
                            })}
                        </h1>
                    </m.div>

                    {/* Secondary links */}
                    <m.div className={styles.socialBar} variants={safeFadeIn}>
                        <div className={styles.socialGroup}>
                            {LINKS_LEFT.map(({ key, href, Icon }) => (
                                <a
                                    key={key}
                                    href={href}
                                    className={styles.socialLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Icon />
                                    {t(key)}
                                </a>
                            ))}
                        </div>

                        <div className={styles.socialGroup}>
                            {LINKS_RIGHT.map(({ key, href, Icon }) => (
                                <a
                                    key={key}
                                    href={href}
                                    className={styles.socialLink}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <Icon />
                                    {t(key)}
                                </a>
                            ))}
                        </div>
                    </m.div>
                </m.div>
            </Container>
        </Section>
    );
}
