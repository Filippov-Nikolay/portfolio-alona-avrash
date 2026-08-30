"use client";

import { useState, useEffect } from "react";
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
import { LangSwitcher, ThemeToggle } from "@/shared/ui";
import type { NavItem } from "@/shared/types";

// Dedicated to the Download CV button only — not the shared ArrowIcon.
function DownloadIcon() {
    return (
        <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
        >
            <path
                d="M12.5535 16.5061C12.4114 16.6615 12.2106 16.75 12 16.75C11.7894 16.75 11.5886 16.6615 11.4465 16.5061L7.44648 12.1311C7.16698 11.8254 7.18822 11.351 7.49392 11.0715C7.79963 10.792 8.27402 10.8132 8.55352 11.1189L11.25 14.0682V3C11.25 2.58579 11.5858 2.25 12 2.25C12.4142 2.25 12.75 2.58579 12.75 3V14.0682L15.4465 11.1189C15.726 10.8132 16.2004 10.792 16.5061 11.0715C16.8118 11.351 16.833 11.8254 16.5535 12.1311L12.5535 16.5061Z"
                fill="#000000"
            />
            <path
                d="M3.75 15C3.75 14.5858 3.41422 14.25 3 14.25C2.58579 14.25 2.25 14.5858 2.25 15V15.0549C2.24998 16.4225 2.24996 17.5248 2.36652 18.3918C2.48754 19.2919 2.74643 20.0497 3.34835 20.6516C3.95027 21.2536 4.70814 21.5125 5.60825 21.6335C6.47522 21.75 7.57754 21.75 8.94513 21.75H15.0549C16.4225 21.75 17.5248 21.75 18.3918 21.6335C19.2919 21.5125 20.0497 21.2536 20.6517 20.6516C21.2536 20.0497 21.5125 19.2919 21.6335 18.3918C21.75 17.5248 21.75 16.4225 21.75 15.0549V15C21.75 14.5858 21.4142 14.25 21 14.25C20.5858 14.25 20.25 14.5858 20.25 15C20.25 16.4354 20.2484 17.4365 20.1469 18.1919C20.0482 18.9257 19.8678 19.3142 19.591 19.591C19.3142 19.8678 18.9257 20.0482 18.1919 20.1469C17.4365 20.2484 16.4354 20.25 15 20.25H9C7.56459 20.25 6.56347 20.2484 5.80812 20.1469C5.07435 20.0482 4.68577 19.8678 4.40901 19.591C4.13225 19.3142 3.9518 18.9257 3.85315 18.1919C3.75159 17.4365 3.75 16.4354 3.75 15Z"
                fill="#000000"
            />
        </svg>
    );
}

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
            <m.header
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
                        onClick={(e) => {
                            e.preventDefault();
                            scrollToTop();
                        }}
                    >
                        <span className={styles.logoLine}>
                            <StaggerText text={LOGO_LINE_1} />
                        </span>
                        <span className={styles.logoLine}>
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
