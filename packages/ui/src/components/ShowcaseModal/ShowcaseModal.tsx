"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { m, AnimatePresence, useInView, useIsPresent, useReducedMotion } from "framer-motion";
import type { ShowcaseItem } from "../../types/showcase";
import { useMounted } from "../../hooks/useMounted";
import { Button } from "../Button";
import { ArrowIcon, CloseIcon } from "../../icons";
import { ACCENT_COLORS } from "../../constants/colors";
import { ToolBadge } from "../ToolBadge";
import { cn } from "../../lib/cn";
import { GalleryLightbox, type LightboxRect } from "./GalleryLightbox";
import { GalleryImages } from "./galleryImages";
import { useGalleryTilt } from "./useGalleryTilt";
import styles from "./ShowcaseModal.module.scss";

const GALLERY_PREVIEW_COUNT = 3;
const STATIC_IMAGE_PRELOAD_MARGIN = "1200px 0px";
const ANIMATED_IMAGE_PRELOAD_MARGIN = "500px 0px";

export type Tab = "overview" | "gallery";

export interface ShowcaseModalLabels {
    viewWebsite: string;
    overviewTab: string;
    galleryTab: string;
    galleryPreview: string;
    tools: string;
}

interface LightboxState {
    index: number;
    launchRect: LightboxRect;
    fillRect: LightboxRect;
}

function chunk<T>(items: T[], size: number): T[][] {
    const rows: T[][] = [];
    for (let i = 0; i < items.length; i += size) {
        rows.push(items.slice(i, i + size));
    }
    return rows;
}

function TileImage({
    imagePool,
    index,
    src,
    scrollRoot,
    frozen,
}: {
    imagePool: GalleryImages;
    index: number;
    src: string;
    scrollRoot: RefObject<HTMLDivElement | null>;
    frozen: boolean;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const animated = /\.gif(?:[?#]|$)/i.test(src);
    const inView = useInView(hostRef, {
        root: scrollRoot,
        margin: animated ? ANIMATED_IMAGE_PRELOAD_MARGIN : STATIC_IMAGE_PRELOAD_MARGIN,
        once: true,
    });
    useLayoutEffect(() => imagePool.connect(index, hostRef.current!), [imagePool, index]);
    useEffect(() => {
        if (inView && !frozen) imagePool.load(index);
    }, [inView, frozen, imagePool, index]);
    return (
        <div
            ref={hostRef}
            className={styles.tileImages}
            data-gallery-tile={index}
            data-load-state="loading"
            aria-busy="true"
        />
    );
}

const nextPaint = () =>
    new Promise<void>((resolve) =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    );

// == ModalContent =========================================

interface ModalContentProps {
    item: ShowcaseItem;
    onClose: () => void;
    initialTab: Tab;
    onTabChange?: (tab: Tab) => void;
    initialLightboxIndex?: number | null;
    onLightboxChange?: (index: number | null) => void;
    labels: ShowcaseModalLabels;
    onVisitWebsite?: () => void;
}

function ModalContent({
    item,
    onClose,
    initialTab,
    onTabChange,
    initialLightboxIndex,
    onLightboxChange,
    labels,
    onVisitWebsite,
}: ModalContentProps) {
    const color = ACCENT_COLORS[item.color ?? "purple"];
    const hasGallery = item.gallery.length > 0;
    const [tab, setTab] = useState<Tab>(initialTab);
    const [contentTab, setContentTab] = useState<Tab>(initialTab);
    const tools = item.tools ?? [];
    const previewImages = item.gallery.slice(0, GALLERY_PREVIEW_COUNT);
    const galleryRows = chunk(
        item.gallery.map((image, index) => ({ image, index })),
        GALLERY_PREVIEW_COUNT
    );
    const modalRef = useRef<HTMLDivElement>(null);
    const closeRef = useRef<HTMLButtonElement>(null);
    const previousFocusRef = useRef<Element | null>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const galleryElRefs = useRef<Map<number, HTMLElement>>(new Map());
    const [lightbox, setLightbox] = useState<LightboxState | null>(null);
    const [lightboxBusy, setLightboxBusy] = useState(false);
    const imagePool = useMemo(() => new GalleryImages(item.gallery), [item.gallery]);
    const openRequest = useRef(0);
    const pendingIndex = useRef<number | null>(null);
    const returnFocusIndex = useRef<number | null>(null);
    const busyRef = useRef(false);
    const [modalEntranceDone, setModalEntranceDone] = useState(false);
    const isPresent = useIsPresent();
    const reducedMotion = useReducedMotion();
    const registerTile = useGalleryTilt(
        bodyRef,
        tabsRef,
        lightboxBusy || !modalEntranceDone || !isPresent
    );
    // Lock before the first paint and keep it until the exit has actually
    // unmounted this content. Autofocus must not scroll the page underneath.
    useLayoutEffect(() => {
        const html = document.documentElement;
        const body = document.body;
        previousFocusRef.current ??= document.activeElement;
        const previousFocus = previousFocusRef.current;
        const scrollbarWidth = window.innerWidth - html.clientWidth;
        const padding = parseFloat(getComputedStyle(html).paddingRight) || 0;
        const previousHtmlOverflow = html.style.overflow;
        const previousBodyOverflow = body.style.overflow;
        const previousHtmlPaddingRight = html.style.paddingRight;
        html.style.overflow = "hidden";
        body.style.overflow = "hidden";
        if (scrollbarWidth > 0) html.style.paddingRight = `${padding + scrollbarWidth}px`;
        closeRef.current?.focus({ preventScroll: true });
        return () => {
            html.style.overflow = previousHtmlOverflow;
            body.style.overflow = previousBodyOverflow;
            html.style.paddingRight = previousHtmlPaddingRight;
            if (previousFocus instanceof HTMLElement && previousFocus.isConnected)
                previousFocus.focus({ preventScroll: true });
        };
    }, []);
    useLayoutEffect(() => {
        if (lightboxBusy || returnFocusIndex.current === null) return;
        galleryElRefs.current.get(returnFocusIndex.current)?.focus({ preventScroll: true });
        returnFocusIndex.current = null;
    }, [lightboxBusy]);
    useEffect(
        () => () => {
            openRequest.current++;
        },
        []
    );
    const autoOpenedLightboxRef = useRef(false);
    const handleTabChange = (nextTab: Tab) => {
        if (nextTab === tab) return;
        setTab(nextTab);
        onTabChange?.(nextTab);

        const body = bodyRef.current;
        if (!body || body.scrollTop === 0) {
            setContentTab(nextTab);
            return;
        }

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        if (reducedMotion) {
            body.scrollTop = 0;
            setContentTab(nextTab);
            return;
        }

        let settled = false;
        const finish = () => {
            if (settled) return;
            settled = true;
            body.removeEventListener("scrollend", finish);
            setContentTab(nextTab);
        };
        body.addEventListener("scrollend", finish, { once: true });
        window.setTimeout(finish, 500);
        body.scrollTo({ top: 0, behavior: "smooth" });
    };

    useEffect(() => {
        const body = bodyRef.current;
        if (!body || lightboxBusy) return;

        let scrollEndTimer: ReturnType<typeof setTimeout>;
        const handleScroll = () => {
            if (!body.hasAttribute("data-scrolling")) body.setAttribute("data-scrolling", "");
            clearTimeout(scrollEndTimer);
            scrollEndTimer = setTimeout(() => body.removeAttribute("data-scrolling"), 180);
        };

        body.addEventListener("scroll", handleScroll, { passive: true });

        return () => {
            body.removeEventListener("scroll", handleScroll);
            clearTimeout(scrollEndTimer);
            body.removeAttribute("data-scrolling");
        };
    }, [lightboxBusy]);

    const galleryRefs = useMemo(
        () =>
            item.gallery.map((_, index) => (el: HTMLElement | null) => {
                if (el) galleryElRefs.current.set(index, el);
                else galleryElRefs.current.delete(index);
                registerTile(index)(contentTab === "gallery" ? el : null);
            }),
        [item.gallery, registerTile, contentTab]
    );

    const measureRect = (el: HTMLElement): LightboxRect | null => {
        const modalEl = modalRef.current;
        if (!modalEl) return null;
        const modalRect = modalEl.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        return {
            top: elRect.top - modalRect.top,
            left: elRect.left - modalRect.left,
            width: elRect.width,
            height: elRect.height,
        };
    };

    const openLightboxAt = async (index: number, el: HTMLElement) => {
        if (busyRef.current) return;
        busyRef.current = true;
        pendingIndex.current = index;
        const request = ++openRequest.current;
        setLightboxBusy(true);
        imagePool.freeze(index);
        try {
            await imagePool.decode(index);
            // Pause background work before measuring the launch geometry once.
            await nextPaint();
            if (request !== openRequest.current) return;
            const modalEl = modalRef.current;
            const tileRect = measureRect(el);
            if (!modalEl || !tileRect) throw new Error("Missing gallery tile");
            // Preserve subpixel layout sizes without the modal entrance's scale.
            // clientWidth/clientHeight would round them before the FLIP starts.
            const modalStyle = getComputedStyle(modalEl);
            pendingIndex.current = null;
            setLightbox({
                index,
                launchRect: tileRect,
                fillRect: {
                    top: 0,
                    left: 0,
                    width: parseFloat(modalStyle.width),
                    height: parseFloat(modalStyle.height),
                },
            });
        } catch {
            if (request !== openRequest.current) return;
            imagePool.release(index);
            imagePool.resume();
            pendingIndex.current = null;
            busyRef.current = false;
            setLightboxBusy(false);
        }
    };

    const openLightbox = (index: number, e: React.MouseEvent<HTMLElement>) => {
        void openLightboxAt(index, e.currentTarget);
    };

    useEffect(() => {
        if (autoOpenedLightboxRef.current) return;
        if (initialLightboxIndex == null) return;
        if (!modalEntranceDone || contentTab !== "gallery") return;

        const el = galleryElRefs.current.get(initialLightboxIndex);
        if (!el) return;

        autoOpenedLightboxRef.current = true;
        el.scrollIntoView({ block: "center", behavior: "instant" });
        void openLightboxAt(initialLightboxIndex, el);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [modalEntranceDone, contentTab, initialLightboxIndex]);

    const prepareClose = async (index: number): Promise<LightboxRect | null> => {
        // Overview has only three tiles. Closing a later image needs its real
        // gallery tile, prepared while the lightbox still covers the modal.
        if (!galleryElRefs.current.has(index)) {
            setTab("gallery");
            setContentTab("gallery");
            onTabChange?.("gallery");
            for (let attempt = 0; attempt < 30 && !galleryElRefs.current.has(index); attempt++)
                await nextPaint();
        }
        const el = galleryElRefs.current.get(index);
        const body = bodyRef.current;
        if (!el || !body) return null;
        const rect = el.getBoundingClientRect();
        const bodyRect = body.getBoundingClientRect();
        const target =
            body.scrollTop + rect.top - bodyRect.top - body.clientHeight / 2 + rect.height / 2;
        body.scrollTo({
            top: Math.max(0, Math.min(body.scrollHeight - body.clientHeight, target)),
            behavior: "instant",
        });
        // Separate scroll writes from measurement and from the closing FLIP.
        await nextPaint();
        return measureRect(el);
    };

    const prepareBackground = async (index: number) => {
        const request = openRequest.current;
        imagePool.restoreTiles(index);
        const body = bodyRef.current;
        if (!body) return;
        const bounds = body.getBoundingClientRect();
        const visible: number[] = [];
        for (const [tileIndex, tile] of galleryElRefs.current) {
            if (tileIndex === index) continue;
            const rect = tile.getBoundingClientRect();
            if (rect.bottom > bounds.top - 80 && rect.top < bounds.bottom + 80)
                visible.push(tileIndex);
        }
        await imagePool.prepareTiles(visible);
        if (request !== openRequest.current) return;
        body.style.visibility = "";
    };

    // ESC closes the lightbox first when it's open, the modal itself otherwise.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== "Escape" || lightbox) return;
            if (busyRef.current) {
                openRequest.current++;
                if (pendingIndex.current !== null) imagePool.release(pendingIndex.current);
                pendingIndex.current = null;
                busyRef.current = false;
                imagePool.resume();
                setLightboxBusy(false);
                return;
            }
            onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [lightbox, onClose, imagePool]);

    const colorStyle = {
        "--c-hex": color.hex,
        "--c-a08": color.a08,
        "--c-a12": color.a12,
        "--c-a14": color.a14,
        "--c-a18": color.a18,
        "--c-a22": color.a22,
        "--c-a25": color.a25,
        "--accent-color-modal": item.accentColorModal,
    } as React.CSSProperties;

    const modalInner = (
        <>
            <button
                ref={closeRef}
                className={styles.close}
                onClick={onClose}
                aria-label="Close"
                disabled={lightboxBusy}
            >
                <CloseIcon className={styles.closeIcon} />
            </button>

            <div
                ref={bodyRef}
                className={styles.body}
                data-lightbox-open={lightboxBusy ? "" : undefined}
                inert={lightboxBusy}
                onPointerMove={(event) => {
                    // Opening under a stationary cursor is not a hover intent.
                    if (event.pointerType === "mouse" && modalEntranceDone && !lightboxBusy)
                        event.currentTarget.setAttribute("data-preview-hover-ready", "");
                }}
            >
                <div className={styles.banner}>
                    {item.src && (
                        <div className={styles.bannerImageWrap}>
                            <Image
                                src={item.src}
                                alt=""
                                fill
                                className={styles.bannerImage}
                                sizes="(max-width: 479px) 100vw, 70vw"
                                quality={95}
                                priority
                                draggable={false}
                            />
                        </div>
                    )}

                    <h2 className={styles.bannerTitle}>{item.title}</h2>

                    {item.websiteUrl && (
                        <Button
                            as="a"
                            href={item.websiteUrl}
                            variant="primary"
                            className={styles.websiteBtn}
                            target="_blank"
                            rel="noopener noreferrer"
                            rightIcon={<ArrowIcon className={styles.arrow} />}
                            onClick={onVisitWebsite}
                        >
                            {labels.viewWebsite}
                        </Button>
                    )}
                </div>

                <div className={styles.content}>
                    <div ref={tabsRef} className={styles.tabs}>
                        <div className={styles.tabsRow} role="tablist">
                            <button
                                type="button"
                                role="tab"
                                aria-selected={tab === "overview"}
                                className={cn(styles.tab, tab === "overview" && styles.tabActive)}
                                onClick={() => handleTabChange("overview")}
                            >
                                {labels.overviewTab}
                            </button>
                            {hasGallery && (
                                <button
                                    type="button"
                                    role="tab"
                                    aria-selected={tab === "gallery"}
                                    className={cn(
                                        styles.tab,
                                        tab === "gallery" && styles.tabActive
                                    )}
                                    onClick={() => handleTabChange("gallery")}
                                >
                                    {labels.galleryTab}
                                </button>
                            )}
                        </div>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                        {contentTab === "overview" ? (
                            <m.div
                                key="overview"
                                className={styles.tabPanel}
                                initial={lightboxBusy ? false : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{
                                    duration: lightboxBusy ? 0 : 0.22,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                            >
                                {previewImages.length > 0 && (
                                    <section className={styles.section}>
                                        <h3 className={styles.sectionLabel}>
                                            {labels.galleryPreview}
                                        </h3>
                                        <div
                                            className={cn(
                                                styles.previewGrid,
                                                styles.overviewPreview
                                            )}
                                            style={
                                                {
                                                    "--preview-count": previewImages.length,
                                                } as React.CSSProperties
                                            }
                                        >
                                            {previewImages.map((image, index) => (
                                                <button
                                                    key={image.src}
                                                    ref={galleryRefs[index]}
                                                    type="button"
                                                    className={styles.previewItem}
                                                    onClick={(e) => openLightbox(index, e)}
                                                    aria-label={image.alt}
                                                >
                                                    <TileImage
                                                        src={image.src}
                                                        imagePool={imagePool}
                                                        index={index}
                                                        scrollRoot={bodyRef}
                                                        frozen={lightboxBusy}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {tools.length > 0 && (
                                    <section className={styles.section}>
                                        <h3 className={styles.sectionLabel}>{labels.tools}</h3>
                                        <div className={styles.toolsRow}>
                                            {tools.map((tool) => (
                                                <ToolBadge
                                                    key={tool.id}
                                                    icon={tool.icon}
                                                    title={tool.title}
                                                    description={tool.description}
                                                />
                                            ))}
                                        </div>
                                    </section>
                                )}
                            </m.div>
                        ) : (
                            <m.div
                                key="gallery"
                                className={styles.tabPanel}
                                initial={lightboxBusy ? false : { opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{
                                    duration: lightboxBusy ? 0 : 0.22,
                                    ease: [0.22, 1, 0.36, 1],
                                }}
                            >
                                <section className={styles.section}>
                                    <div className={styles.galleryRows}>
                                        {galleryRows.map((row, rowIndex) => (
                                            <div key={rowIndex} className={styles.previewGrid}>
                                                {row.map(({ image, index }) => (
                                                    <button
                                                        key={image.src}
                                                        ref={galleryRefs[index]}
                                                        type="button"
                                                        className={cn(
                                                            styles.previewItem,
                                                            styles.galleryTile
                                                        )}
                                                        onClick={(e) => openLightbox(index, e)}
                                                        aria-label={image.alt}
                                                    >
                                                        <TileImage
                                                            src={image.src}
                                                            imagePool={imagePool}
                                                            index={index}
                                                            scrollRoot={bodyRef}
                                                            frozen={lightboxBusy}
                                                        />
                                                    </button>
                                                ))}
                                            </div>
                                        ))}
                                    </div>
                                </section>
                            </m.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {lightbox && (
                <GalleryLightbox
                    images={item.gallery}
                    imagePool={imagePool}
                    initialIndex={lightbox.index}
                    launchRect={lightbox.launchRect}
                    fillRect={lightbox.fillRect}
                    prepareClose={prepareClose}
                    prepareBackground={prepareBackground}
                    onOpened={() => {
                        if (bodyRef.current) bodyRef.current.style.visibility = "hidden";
                        onLightboxChange?.(lightbox.index);
                    }}
                    onClose={(index) => {
                        returnFocusIndex.current = index;
                        setLightbox(null);
                        if (bodyRef.current) bodyRef.current.style.visibility = "";
                        imagePool.resume();
                        busyRef.current = false;
                        setLightboxBusy(false);
                        onLightboxChange?.(null);
                    }}
                />
            )}
        </>
    );

    return (
        <m.div
            ref={modalRef}
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
            data-state={!isPresent ? "closing" : modalEntranceDone ? "open" : "opening"}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reducedMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
            onAnimationComplete={() => {
                if (isPresent) setModalEntranceDone(true);
            }}
            onClick={(e) => e.stopPropagation()}
            style={colorStyle}
        >
            {modalInner}
        </m.div>
    );
}

// == ShowcaseModal ==========================================

interface ShowcaseModalProps {
    item: ShowcaseItem | null;
    onClose: () => void;
    initialTab?: Tab;
    onTabChange?: (tab: Tab) => void;
    initialLightboxIndex?: number | null;
    onLightboxChange?: (index: number | null) => void;
    labels: ShowcaseModalLabels;
    onVisitWebsite?: () => void;
}

export function ShowcaseModal({
    item,
    onClose,
    initialTab = "overview",
    onTabChange,
    initialLightboxIndex,
    onLightboxChange,
    labels,
    onVisitWebsite,
}: ShowcaseModalProps) {
    const mounted = useMounted();

    const reducedMotion = useReducedMotion();

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {item && (
                <div key={item.id} className={styles.overlay}>
                    <m.div
                        className={styles.backdrop}
                        aria-hidden="true"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: reducedMotion ? 0 : 0.22 }}
                    />
                    <div
                        className={styles.overlayInner}
                        onClick={(e) => {
                            e.stopPropagation();
                            onClose();
                        }}
                    >
                        <ModalContent
                            key={item.id}
                            item={item}
                            onClose={onClose}
                            initialTab={initialTab}
                            onTabChange={onTabChange}
                            initialLightboxIndex={initialLightboxIndex}
                            onLightboxChange={onLightboxChange}
                            labels={labels}
                            onVisitWebsite={onVisitWebsite}
                        />
                    </div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
