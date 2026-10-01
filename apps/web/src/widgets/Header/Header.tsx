"use client";

import { useState, useEffect, useRef, useId, type MouseEvent } from "react";
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
import { downloadCv } from "@/entities/cv/api/downloadCv";
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

function triggerCvDownload(blob: Blob, fileName: string) {
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(href), 1_000);
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

export interface HeaderCv {
    href: string;
    locale: string;
}

function CvLink({
    href,
    mobile = false,
    clicked,
    downloadState,
    onDownload,
    onAnimationEnd,
}: {
    href: string | null;
    mobile?: boolean;
    clicked: boolean;
    downloadState: "idle" | "loading" | "error";
    onDownload: (event: MouseEvent<HTMLAnchorElement>) => void;
    onAnimationEnd: () => void;
}) {
    const t = useTranslations("nav");
    const hasCv = href !== null;
    const descriptionId = useId();
    const linkRef = useRef<HTMLAnchorElement>(null);
    const [showUnavailable, setShowUnavailable] = useState(false);

    useEffect(() => {
        if (!showUnavailable || hasCv) return;

        function onOutsidePointer(event: PointerEvent) {
            if (!linkRef.current?.contains(event.target as Node)) setShowUnavailable(false);
        }
        function onEscape(event: KeyboardEvent) {
            if (event.key === "Escape") setShowUnavailable(false);
        }
        document.addEventListener("pointerdown", onOutsidePointer);
        document.addEventListener("keydown", onEscape);
        return () => {
            document.removeEventListener("pointerdown", onOutsidePointer);
            document.removeEventListener("keydown", onEscape);
        };
    }, [showUnavailable, hasCv]);

    return (
        <m.a
            ref={linkRef}
            href={href ?? undefined}
            download={hasCv || undefined}
            role="link"
            tabIndex={0}
            aria-disabled={!hasCv || downloadState === "loading" || undefined}
            aria-busy={downloadState === "loading" || undefined}
            aria-label={t("downloadCv")}
            aria-describedby={!hasCv || downloadState !== "idle" ? descriptionId : undefined}
            data-unavailable-visible={
                (!hasCv && showUnavailable) || downloadState !== "idle" ? "" : undefined
            }
            className={cn(mobile ? styles.menuCv : styles.cvPill, clicked && styles.cvPillClicked)}
            style={mobile ? undefined : pillDelay(3)}
            variants={mobile ? menuItemVariants : undefined}
            onClick={(event) => {
                if (hasCv) {
                    onDownload(event);
                    return;
                }
                event.preventDefault();
                setShowUnavailable(true);
            }}
            onPointerEnter={(event) => {
                if (!hasCv && event.pointerType === "mouse") setShowUnavailable(true);
            }}
            onPointerLeave={(event) => {
                if (event.pointerType === "mouse") setShowUnavailable(false);
            }}
            onFocus={() => {
                if (!hasCv) setShowUnavailable(true);
            }}
            onBlur={() => setShowUnavailable(false)}
            onKeyDown={(event) => {
                if (event.key === "Escape" && showUnavailable) {
                    event.preventDefault();
                    event.stopPropagation();
                    setShowUnavailable(false);
                }
                if (!hasCv && event.key === "Enter") {
                    event.preventDefault();
                    setShowUnavailable(true);
                }
            }}
            onAnimationEnd={onAnimationEnd}
        >
            <span className={mobile ? styles.menuCvLabel : styles.cvLabel} aria-hidden="true">
                <span className={styles.cvActionText}>{t("downloadCv")}</span>
                {(!hasCv || downloadState !== "idle") && (
                    <span className={styles.cvStatusText}>
                        {t(
                            !hasCv
                                ? "cvUnavailableShort"
                                : downloadState === "loading"
                                  ? "cvDownloading"
                                  : "cvDownloadRetry"
                        )}
                    </span>
                )}
            </span>
            <span className={mobile ? styles.menuCvIcon : styles.cvIcon} aria-hidden="true">
                <DownloadIcon />
            </span>
            <span id={descriptionId} className={styles.srOnly} role="status">
                {!hasCv
                    ? t("cvUnavailable")
                    : downloadState === "error"
                      ? t("cvDownloadFailed")
                      : downloadState === "loading"
                        ? t("cvDownloading")
                        : ""}
            </span>
        </m.a>
    );
}

export function Header({ cv }: { cv: HeaderCv | null }) {
    const safeSlideDown = useMotionVariants(slideDown);
    const t = useTranslations("nav");
    const { isReady } = usePreloader();
    const pathname = usePathname();
    const [cvClicked, setCvClicked] = useState(false);
    const [cvDownloadState, setCvDownloadState] = useState<"idle" | "loading" | "error">("idle");
    const cvDownloadController = useRef<AbortController | null>(null);
    const nextCvDownloadAt = useRef(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const previousPathnameRef = useRef(pathname);
    const headerRef = useRef<HTMLElement>(null);
    const sceneBackdropRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const menuTriggerRef = useRef<HTMLButtonElement>(null);
    const { bandY, bandVisibility } = useServicesHeaderBandController(headerRef, sceneBackdropRef);
    useHeaderHeightVar(headerRef);

    useEffect(
        () => () => {
            cvDownloadController.current?.abort();
            cvDownloadController.current = null;
        },
        []
    );

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
            if (e.key === "Escape" && !e.defaultPrevented) setMenuOpen(false);
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

    async function handleCvClick(e: MouseEvent<HTMLAnchorElement>, { closeMenu = false } = {}) {
        if (!cv) {
            e.preventDefault();
            return;
        }
        if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
            return;
        }
        e.preventDefault();
        if (cvDownloadController.current || Date.now() < nextCvDownloadAt.current) return;
        const controller = new AbortController();
        cvDownloadController.current = controller;
        const timeout = window.setTimeout(() => controller.abort(), 20_000);
        setCvClicked(true);
        setCvDownloadState("loading");
        try {
            const [file] = await Promise.all([
                downloadCv(cv.href, controller.signal),
                new Promise((resolve) => window.setTimeout(resolve, CV_DOWNLOAD_DELAY_MS)),
            ]);
            if (controller.signal.aborted) return;
            triggerCvDownload(file.blob, file.fileName);
            trackEvent("cv_download", { entityId: file.locale ?? cv.locale });
            setCvDownloadState("idle");
            if (closeMenu) setMenuOpen(false);
        } catch {
            if (cvDownloadController.current === controller) setCvDownloadState("error");
        } finally {
            window.clearTimeout(timeout);
            if (cvDownloadController.current === controller) {
                cvDownloadController.current = null;
                nextCvDownloadAt.current = Date.now() + 1_000;
            }
        }
    }

    return (
        <>
            <m.div
                ref={sceneBackdropRef}
                className={styles.sceneBackdrop}
                style={{ y: bandY, visibility: bandVisibility }}
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
                        style={pillDelay(0)}
                        data-hero-logo-target
                        onClick={(e) => {
                            if (pathname !== "/") return;
                            e.preventDefault();
                            scrollToTop();
                        }}
                    >
                        <span className={styles.srOnly}>{`${siteConfig.name} - Home`}</span>
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

                    <CvLink
                        href={cv?.href ?? null}
                        clicked={cvClicked}
                        downloadState={cvDownloadState}
                        onDownload={handleCvClick}
                        onAnimationEnd={() => setCvClicked(false)}
                    />

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

                                    <CvLink
                                        href={cv?.href ?? null}
                                        mobile
                                        clicked={cvClicked}
                                        downloadState={cvDownloadState}
                                        onDownload={(e) => handleCvClick(e, { closeMenu: true })}
                                        onAnimationEnd={() => setCvClicked(false)}
                                    />
                                </div>
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>
            </m.header>
        </>
    );
}
