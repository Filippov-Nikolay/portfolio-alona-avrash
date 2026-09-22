"use client";

import { useState, useEffect, useRef, type MouseEvent } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { siteConfig } from "@/shared/config/site.config";
import { navigation } from "@/shared/config/navigation.config";
import { useMotionVariants } from "@/shared/hooks/useMotionVariants";
import { slideDown } from "@/shared/lib/motion/slide-down";
import { scrollToTop } from "@/shared/lib/scroll";
import { usePreloader } from "@/shared/providers";
import { trackEvent } from "@/shared/analytics/analytics";
import { cn } from "@/shared/lib/cn";
import styles from "./Header.module.scss";
import { useServicesHeaderBandController } from "./useServicesHeaderBandController";
import { useHeaderHeightVar } from "./useHeaderHeightVar";
import { LangSwitcher, ThemeToggle, DownloadIcon } from "@/shared/ui";
import type { NavItem } from "@/shared/types";

// "Alona Avrash" -> ["Alona", "Avrash"] for the two-line logo lockup.
const [LOGO_LINE_1, ...logoRest] = siteConfig.name.split(" ");
const LOGO_LINE_2 = logoRest.join(" ");

function isHomeLink(item: NavItem) {
    return item.href === "/";
}

function isActiveLink(pathname: string, item: NavItem) {
    if (isHomeLink(item)) return pathname === "/";
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
}

const CV_DOWNLOAD_DELAY_MS = 250;

function triggerCvDownload(href: string) {
    const link = document.createElement("a");
    link.href = href;
    link.download = "";
    document.body.appendChild(link);
    link.click();
    link.remove();
}

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

const MENU_CLOSE_EASE = [0.22, 1, 0.36, 1] as const;
const MENU_OPEN_EASE = [0.25, 0.1, 0.25, 1] as const;

const menuPanelVariants = {
    hidden: {
        opacity: 0,
        y: -8,
        scale: 0.97,
        transition: { duration: 0.2, ease: MENU_CLOSE_EASE },
    },
    visible: {
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            duration: 0.22,
            ease: MENU_OPEN_EASE,
            staggerChildren: 0.04,
            delayChildren: 0.03,
        },
    },
};

const menuItemVariants = {
    hidden: { opacity: 0, y: -6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
};

export function Header() {
    const safeSlideDown = useMotionVariants(slideDown);
    const t = useTranslations("nav");
    const { isReady } = usePreloader();
    const pathname = usePathname();
    const [cvClicked, setCvClicked] = useState(false);
    const [menuOpen, setMenuOpen] = useState(false);
    const previousPathnameRef = useRef(pathname);
    const headerRef = useRef<HTMLElement>(null);
    const sceneBackdropRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuTriggerRef = useRef<HTMLButtonElement>(null);
    const bandY = useServicesHeaderBandController(headerRef, sceneBackdropRef);
    useHeaderHeightVar(headerRef);

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

    useEffect(() => {
        if (previousPathnameRef.current === pathname) return;

        previousPathnameRef.current = pathname;
        // Route changes are an external navigation event. Closing here keeps
        // the render phase pure and avoids a delayed reset racing the first tap.
        setMenuOpen(false);
    }, [pathname]);

    useEffect(() => {
        if (!menuOpen) return;

        function onOutsideClick(e: PointerEvent) {
            const target = e.target as Node;
            if (menuRef.current?.contains(target)) return;
            if (menuTriggerRef.current?.contains(target)) return;
            setMenuOpen(false);
        }
        function onEscape(e: KeyboardEvent) {
            if (e.key === "Escape") setMenuOpen(false);
        }
        function preventScroll(e: Event) {
            e.preventDefault();
        }
        document.addEventListener("pointerdown", onOutsideClick);
        document.addEventListener("keydown", onEscape);
        document.addEventListener("wheel", preventScroll, { passive: false });
        document.addEventListener("touchmove", preventScroll, { passive: false });

        return () => {
            document.removeEventListener("pointerdown", onOutsideClick);
            document.removeEventListener("keydown", onEscape);
            document.removeEventListener("wheel", preventScroll);
            document.removeEventListener("touchmove", preventScroll);
        };
    }, [menuOpen]);

    function handleCvClick(e: MouseEvent<HTMLAnchorElement>, { closeMenu = false } = {}) {
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
        }
        e.preventDefault();
        setCvClicked(true);
        if (closeMenu) setMenuOpen(false);
        trackEvent("cv_download");
        setTimeout(() => triggerCvDownload(siteConfig.links.cv), CV_DOWNLOAD_DELAY_MS);
    }

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

            <AnimatePresence>
                {menuOpen && (
                    <m.div
                        className={styles.menuOverlay}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.25, ease: "easeOut" }}
                        aria-hidden="true"
                        data-menu-overlay
                    >
                        <div className={styles.menuOverlayBlur} data-menu-overlay-blur />
                    </m.div>
                )}
            </AnimatePresence>

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
                            if (pathname !== "/") return;
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
                                    <Link
                                        href={item.href}
                                        onClick={(e) => {
                                            if (!isHomeLink(item) || pathname !== "/") return;
                                            e.preventDefault();
                                            scrollToTop();
                                        }}
                                        className={cn(
                                            styles.link,
                                            isActiveLink(pathname, item) && styles.linkActive
                                        )}
                                    >
                                        <span className={styles.srOnly}>{t(item.key)}</span>
                                        <StaggerText text={t(item.key)} />
                                    </Link>
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
                    </div>

                    <a
                        href={siteConfig.links.cv}
                        download
                        className={cn(styles.cvPill, cvClicked && styles.cvPillClicked)}
                        style={pillDelay(3)}
                        onClick={handleCvClick}
                        onAnimationEnd={() => setCvClicked(false)}
                    >
                        <span className={styles.cvLabel}>{t("downloadCv")}</span>
                        <span className={styles.cvIcon} aria-hidden="true">
                            <DownloadIcon />
                        </span>
                    </a>

                    <button
                        ref={menuTriggerRef}
                        type="button"
                        className={cn(styles.menuTrigger, menuOpen && styles.menuTriggerOpen)}
                        style={pillDelay(2)}
                        onClick={() => setMenuOpen((open) => !open)}
                        aria-haspopup="true"
                        aria-expanded={menuOpen}
                        aria-label={menuOpen ? "Close menu" : "Open menu"}
                    >
                        <span className={styles.menuIcon} aria-hidden="true">
                            <span className={styles.menuBar} />
                            <span className={styles.menuBar} />
                            <span className={styles.menuBar} />
                        </span>
                    </button>

                    <AnimatePresence>
                        {menuOpen && (
                            <m.div
                                ref={menuRef}
                                className={styles.menuPanel}
                                variants={menuPanelVariants}
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                style={{ transformOrigin: "top" }}
                                data-menu-panel
                            >
                                <div
                                    className={styles.menuPanelSurface}
                                    aria-hidden="true"
                                    data-menu-panel-surface
                                />
                                <div className={styles.menuPanelContent}>
                                    <nav aria-label="Mobile navigation">
                                        <ul className={styles.menuNavList}>
                                            {navigation.map((item) => {
                                                const isActive = isActiveLink(pathname, item);

                                                return (
                                                    <m.li
                                                        key={item.href}
                                                        variants={menuItemVariants}
                                                    >
                                                        <Link
                                                            href={item.href}
                                                            onClick={(e) => {
                                                                setMenuOpen(false);
                                                                if (
                                                                    !isHomeLink(item) ||
                                                                    pathname !== "/"
                                                                ) {
                                                                    return;
                                                                }
                                                                e.preventDefault();
                                                                scrollToTop();
                                                            }}
                                                            className={cn(
                                                                styles.menuNavLink,
                                                                isActive && styles.menuNavLinkActive
                                                            )}
                                                        >
                                                            <span>{t(item.key)}</span>
                                                        </Link>
                                                    </m.li>
                                                );
                                            })}
                                        </ul>
                                    </nav>

                                    <m.a
                                        href={siteConfig.links.cv}
                                        download
                                        className={cn(
                                            styles.menuCv,
                                            cvClicked && styles.cvPillClicked
                                        )}
                                        variants={menuItemVariants}
                                        onClick={(e) => handleCvClick(e, { closeMenu: true })}
                                        onAnimationEnd={() => setCvClicked(false)}
                                    >
                                        <span className={styles.menuCvLabel}>
                                            {t("downloadCv")}
                                        </span>
                                        <span className={styles.menuCvIcon} aria-hidden="true">
                                            <DownloadIcon />
                                        </span>
                                    </m.a>
                                </div>
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>
            </m.header>
        </>
    );
}
