"use client";

import { useState, useEffect, useRef } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { siteConfig } from "@/shared/config/site.config";
import { navigation } from "@/shared/config/navigation.config";
import { useMotionVariants } from "@/shared/hooks/useMotionVariants";
import { useActiveSection } from "@/shared/hooks";
import { slideDown } from "@/shared/lib/motion/slide-down";
import { scrollToElementId, scrollToTop } from "@/shared/lib/scroll";
import { usePreloader } from "@/shared/providers";
import { cn } from "@/shared/lib/cn";
import styles from "./Header.module.scss";
import { useServicesHeaderBandController } from "./useServicesHeaderBandController";
import { LangSwitcher, ThemeToggle, DownloadIcon } from "@/shared/ui";
import type { NavItem } from "@/shared/types";

// "Alona Avrash" -> ["Alona", "Avrash"] for the two-line logo lockup.
const [LOGO_LINE_1, ...logoRest] = siteConfig.name.split(" ");
const LOGO_LINE_2 = logoRest.join(" ");

// Derived from `navigation` — never hardcoded separately, so adding or
// removing a nav entry can't leave the scroll-spy out of sync.
const SECTION_IDS = navigation.map((item) => item.key);

const SCROLL_OFFSET = 100;

function scrollToSection(e: React.MouseEvent<HTMLAnchorElement>, item: NavItem) {
    e.preventDefault();
    scrollToElementId(item.key, { offset: SCROLL_OFFSET + (item.scrollOffset ?? 0) });
}

// One-after-another entrance for the 4 pills (see .main > * in
// Header.module.scss) — index order matches their left-to-right layout.
const PILL_ENTRANCE_STEP_MS = 90;
function pillDelay(index: number): React.CSSProperties {
    return { "--pill-delay": `${index * PILL_ENTRANCE_STEP_MS}ms` } as React.CSSProperties;
}

const STAGGER_STEP_MS = 60;

// Splits the label into one masked column per letter so :hover (see
// Header.module.scss) can slide each one up in sequence, staircase-style.
function StaggerText({ text }: { text: string }) {
    return (
        <span className={styles.linkText} aria-hidden="true">
            {Array.from(text).map((char, i) => (
                <span
                    key={i}
                    className={styles.charCol}
                    style={{ "--stagger-delay": `${i * STAGGER_STEP_MS}ms` } as React.CSSProperties}
                >
                    <span className={styles.charTop}>{char}</span>
                    <span className={styles.charBottom}>{char}</span>
                </span>
            ))}
        </span>
    );
}

export function Header() {
    const safeSlideDown = useMotionVariants(slideDown);
    const t = useTranslations("nav");
    const { isReady } = usePreloader();
    const activeSection = useActiveSection(SECTION_IDS, isReady);
    const [cvClicked, setCvClicked] = useState(false);
    const headerRef = useRef<HTMLElement>(null);
    const sceneBackdropRef = useRef<HTMLDivElement>(null);
    const bandY = useServicesHeaderBandController(headerRef, sceneBackdropRef);

    // Keep the pills hidden for at least one committed frame after `isReady`
    // so the browser always sees a real "before" state. This is what makes
    // the entrance replay on every full reload, even when the preloader is
    // skipped for returning visitors via the cookie.
    const [pillsReady, setPillsReady] = useState(false);
    useEffect(() => {
        if (!isReady) return;

        let raf1 = 0;
        let raf2 = 0;
        raf1 = requestAnimationFrame(() => {
            raf2 = requestAnimationFrame(() => setPillsReady(true));
        });

        return () => {
            cancelAnimationFrame(raf1);
            cancelAnimationFrame(raf2);
        };
    }, [isReady]);

    return (
        <>
            <m.div
                ref={sceneBackdropRef}
                className={styles.sceneBackdrop}
                style={{ y: bandY }}
                data-services-header-band
                data-services-header-controller
                aria-hidden="true"
            />

            <m.header
                ref={headerRef}
                className={styles.wrapper}
                variants={safeSlideDown}
                initial="hidden"
                animate={isReady ? "visible" : "hidden"}
            >
                <div className={cn(styles.main, pillsReady && styles.mainReady)}>
                    <Link
                        href="/"
                        className={styles.logoPill}
                        aria-label="Home"
                        style={pillDelay(0)}
                        data-hero-logo-target
                        onClick={(e) => {
                            e.preventDefault();
                            scrollToTop();
                        }}
                    >
                        <span className={styles.logoLine} data-hero-logo-line="0">
                            <StaggerText text={LOGO_LINE_1} />
                        </span>
                        <span className={styles.logoLine} data-hero-logo-line="1">
                            <StaggerText text={LOGO_LINE_2} />
                        </span>
                    </Link>

                    <nav
                        className={styles.navPill}
                        aria-label="Main navigation"
                        style={pillDelay(1)}
                    >
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
                                        <span className={styles.srOnly}>{t(item.key)}</span>
                                        <StaggerText text={t(item.key)} />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    <div className={styles.utilityPill} style={pillDelay(2)}>
                        <div className={styles.langThemeDesktop}>
                            <LangSwitcher
                                className={styles.langWrapperDesktop}
                                triggerClassName={styles.langTrigger}
                            />
                            <ThemeToggle className={styles.themeBtnDesktop} />
                        </div>
                        <div className={styles.langMobile}>
                            <LangSwitcher
                                className={styles.langMobileWrapper}
                                triggerClassName={styles.langMobileTrigger}
                            />
                        </div>
                    </div>

                    <a
                        href={siteConfig.links.cv}
                        download
                        className={cn(styles.cvPill, cvClicked && styles.cvPillClicked)}
                        style={pillDelay(3)}
                        onClick={() => setCvClicked(true)}
                        onAnimationEnd={() => setCvClicked(false)}
                    >
                        <span className={styles.cvLabel}>{t("downloadCv")}</span>
                        <span className={styles.cvIcon} aria-hidden="true">
                            <DownloadIcon />
                        </span>
                    </a>
                </div>
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
