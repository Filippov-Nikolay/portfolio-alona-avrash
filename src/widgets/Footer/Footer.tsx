"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { siteConfig, siteInitials } from "@/shared/config/site.config";
import { navigation } from "@/shared/config/navigation.config";
import { scrollToElementId, scrollToTop } from "@/shared/lib/scroll";
import { cn } from "@/shared/lib/cn";
import { Container, ContactIcon, GitHubIcon, LinkedInIcon, TelegramIcon } from "@/shared/ui";
import type { NavItem } from "@/shared/types";
import styles from "./Footer.module.scss";

const SOCIAL_LINKS = [
    { key: "github", href: siteConfig.links.github, Icon: GitHubIcon },
    { key: "linkedin", href: siteConfig.links.linkedin, Icon: LinkedInIcon },
    { key: "telegram", href: siteConfig.links.telegram, Icon: TelegramIcon },
    { key: "gmail", href: siteConfig.links.email, Icon: ContactIcon },
] as const;

const SCROLL_OFFSET = 100;

// Same offset logic as Header — kept in sync via `item.scrollOffset` on
// the shared `navigation` config, not a second hardcoded value here.
function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) {
    e.preventDefault();
    scrollToElementId(item.key, { offset: SCROLL_OFFSET + (item.scrollOffset ?? 0) });
}

export function Footer() {
    const t = useTranslations("nav");
    const tf = useTranslations("footer");
    const year = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <Container>
                <div className={styles.top}>
                    <Link
                        href="/"
                        className={styles.brand}
                        aria-label="Home"
                        onClick={(e) => {
                            e.preventDefault();
                            scrollToTop();
                        }}
                    >
                        <span className={styles.avatar} aria-hidden="true">
                            {siteInitials}
                        </span>
                        <span className={styles.name}>{siteConfig.name}</span>
                    </Link>

                    <nav aria-label="Footer navigation">
                        <ul className={styles.nav}>
                            {navigation.map((item) => (
                                <li key={item.href}>
                                    <a href={item.href} onClick={(e) => scrollToSection(e, item)}>
                                        {t(item.key)}
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <ul className={styles.social} aria-label="Social links">
                        {SOCIAL_LINKS.map(({ key, href, Icon }) => (
                            <li key={key}>
                                <a
                                    href={href}
                                    target={href.startsWith("mailto") ? undefined : "_blank"}
                                    rel={
                                        href.startsWith("mailto")
                                            ? undefined
                                            : "noopener noreferrer"
                                    }
                                    aria-label={key}
                                    className={styles.socialLink}
                                >
                                    <Icon aria-hidden="true" />
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className={cn(styles.bottom)}>
                    <p className={styles.copyright}>
                        © {year} {siteConfig.name}. {tf("rights")}
                    </p>
                </div>
            </Container>
        </footer>
    );
}
