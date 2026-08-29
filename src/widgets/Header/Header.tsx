"use client";

import { m, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { siteConfig, siteInitials } from "@/shared/config/site.config";
import { navigation } from "@/shared/config/navigation.config";
import { useMotionVariants } from "@/shared/hooks/useMotionVariants";
import { useActiveSection } from "@/shared/hooks";
import { slideDown } from "@/shared/lib/motion/slide-down";
import { scrollToElementId, scrollToTop } from "@/shared/lib/scroll";
import { usePreloader } from "@/shared/providers";
import { cn } from "@/shared/lib/cn";
import styles from "./Header.module.scss";
import { Container, LangSwitcher, ThemeToggle } from "@/shared/ui";
import type { NavItem } from "@/shared/types";

// Derived from `navigation` — never hardcoded separately, so adding or
// removing a nav entry can't leave the scroll-spy out of sync.
const SECTION_IDS = navigation.map((item) => item.key);

const SCROLL_OFFSET = 100;

function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) {
    e.preventDefault();
    scrollToElementId(item.key, { offset: SCROLL_OFFSET + (item.scrollOffset ?? 0) });
}

export function Header() {
    const safeSlideDown = useMotionVariants(slideDown);
    const t = useTranslations("nav");
    const { isReady } = usePreloader();
    const activeSection = useActiveSection(SECTION_IDS, isReady);

    return (
        <>
            <m.header
                className={styles.wrapper}
                variants={safeSlideDown}
                initial="hidden"
                animate={isReady ? "visible" : "hidden"}
            >
                <Container>
                    <div className={styles.main}>
                        <div className={styles.inner}>
                            <Link
                                href="/"
                                className={styles.logo}
                                aria-label="Home"
                                onClick={(e) => {
                                    e.preventDefault();
                                    scrollToTop();
                                }}
                            >
                                <div className={styles.avatar} aria-hidden="true">
                                    {siteInitials}
                                </div>
                                <span className={styles.name}>{siteConfig.name}</span>
                            </Link>

                            <nav aria-label="Main navigation">
                                <ul className={styles.nav}>
                                    {navigation.map((item) => (
                                        <li key={item.href}>
                                            <a
                                                href={item.href}
                                                onClick={(e) => scrollToSection(e, item)}
                                                className={cn(
                                                    styles.link,
                                                    activeSection === item.key && styles.linkActive
                                                )}
                                            >
                                                <AnimatePresence>
                                                    {activeSection === item.key && (
                                                        <m.span
                                                            key="pill"
                                                            layoutId="desktop-nav-pill"
                                                            className={styles.activePill}
                                                            initial={{ opacity: 0 }}
                                                            animate={{ opacity: 1 }}
                                                            exit={{ opacity: 0 }}
                                                            transition={{
                                                                opacity: {
                                                                    duration: 0.2,
                                                                    ease: "easeInOut",
                                                                },
                                                                layout: {
                                                                    type: "spring",
                                                                    stiffness: 380,
                                                                    damping: 32,
                                                                },
                                                            }}
                                                        />
                                                    )}
                                                </AnimatePresence>
                                                {t(item.key)}
                                            </a>
                                        </li>
                                    ))}
                                </ul>
                            </nav>

                            <div className={styles.langDesktop}>
                                <LangSwitcher triggerClassName={styles.langDesktopTrigger} />
                            </div>
                        </div>

                        <div className={styles.inner}>
                            <div className={styles.langMobile}>
                                <LangSwitcher
                                    className={styles.langMobileWrapper}
                                    triggerClassName={styles.langMobileTrigger}
                                />
                            </div>
                            <ThemeToggle className={styles.btnThemeToggle} />
                        </div>
                    </div>
                </Container>
            </m.header>

            {/* Mobile bottom nav — outside animated wrapper to avoid transform containment issues */}
            <nav className={styles.mobileNav} aria-label="Mobile navigation">
                <div className={styles.mobileNavInner}>
                    {navigation.map((item) => (
                        <a
                            key={item.href}
                            href={item.href}
                            onClick={(e) => scrollToSection(e, item)}
                            aria-label={t(item.key)}
                            className={cn(
                                styles.mobileNavLink,
                                activeSection === item.key && styles.mobileNavLinkActive
                            )}
                        >
                            <AnimatePresence>
                                {activeSection === item.key && (
                                    <m.span
                                        key="pill"
                                        layoutId="mobile-nav-pill"
                                        className={styles.mobileActivePill}
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        transition={{
                                            opacity: { duration: 0.2, ease: "easeInOut" },
                                            layout: { type: "spring", stiffness: 380, damping: 32 },
                                        }}
                                    />
                                )}
                            </AnimatePresence>
                            <m.span
                                className={styles.mobileNavIcon}
                                animate={
                                    activeSection === item.key
                                        ? { scale: 1.18, y: -2 }
                                        : { scale: 1, y: 0 }
                                }
                                transition={{ type: "spring", stiffness: 400, damping: 22 }}
                            >
                                {item.icon && <item.icon aria-hidden="true" />}
                            </m.span>
                        </a>
                    ))}
                </div>
                <div className={styles.mobileNavThemePill}>
                    <ThemeToggle className={styles.mobileNavThemeBtn} />
                </div>
            </nav>
        </>
    );
}
