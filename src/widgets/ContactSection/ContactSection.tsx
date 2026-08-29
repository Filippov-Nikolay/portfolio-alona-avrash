"use client";

import { useTranslations } from "next-intl";
import { usePreloader } from "@/shared/providers";
import {
    Container,
    ContactIcon,
    GitHubIcon,
    LinkedInIcon,
    Section,
    SectionHeader,
    TelegramIcon,
} from "@/shared/ui";
import { siteConfig } from "@/shared/config/site.config";
import { useContactSectionAnimations } from "./useContactSectionAnimations";
import styles from "./ContactSection.module.scss";

const SOCIAL_LINKS = [
    { key: "telegram", href: siteConfig.links.telegram, Icon: TelegramIcon, labelKey: "telegram" },
    { key: "gmail", href: siteConfig.links.email, Icon: ContactIcon, labelKey: "gmail" },
    { key: "linkedin", href: siteConfig.links.linkedin, Icon: LinkedInIcon, labelKey: "linkedin" },
    // { key: "instagram", href: siteConfig.links.instagram,  Icon: InstagramIcon, labelKey: "instagram" },
] as const;

export function ContactSection() {
    const t = useTranslations("contact");
    const { isReady } = usePreloader();

    const { sectionRef, headerRef, terminalWrapRef, headlineBlockRef, linksRef } =
        useContactSectionAnimations(isReady);

    return (
        <Section id="contact" className={styles.section}>
            <Container>
                <div ref={sectionRef}>
                    {/* === Header === */}
                    <div ref={headerRef} className={styles.header}>
                        <SectionHeader ref={terminalWrapRef} title="CONTACT" />
                    </div>

                    {/* === Headline display === */}
                    <div ref={headlineBlockRef} className={styles.headlineBlock}>
                        <div className={styles.headlineLeft}>
                            <span className={styles.headlineStart} data-contact-start>
                                {t("headlineStart")}
                            </span>
                            <span className={styles.tagline} data-contact-tagline>
                                {t("tagline")}
                            </span>
                        </div>
                        <span className={styles.headlineEnd} data-contact-end>
                            {t("headlineEnd")}
                        </span>
                    </div>

                    {/* === Social links === */}
                    <div ref={linksRef} className={styles.linksRow}>
                        <a
                            href={siteConfig.links.github}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.githubLink}
                            aria-label={t("github")}
                        >
                            <GitHubIcon className={styles.linkIcon} aria-hidden="true" />
                            <span>{t("github")}</span>
                        </a>

                        <ul className={styles.socialList} aria-label="Social links">
                            {SOCIAL_LINKS.map(({ key, href, Icon, labelKey }) => (
                                <li key={key}>
                                    <a
                                        href={href}
                                        target={href.startsWith("mailto") ? undefined : "_blank"}
                                        rel={
                                            href.startsWith("mailto")
                                                ? undefined
                                                : "noopener noreferrer"
                                        }
                                        className={styles.socialLink}
                                        aria-label={t(labelKey)}
                                    >
                                        <Icon className={styles.linkIcon} aria-hidden="true" />
                                        <span>{t(labelKey)}</span>
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Container>
        </Section>
    );
}
