"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { m, animate, AnimatePresence, useInView } from "framer-motion";
import { useTranslations } from "next-intl";
import type { ShowcaseItem } from "@/shared/types";
import { useMounted } from "@/shared/hooks/useMounted";
import { Button, ArrowIcon, ToolBadge, getToolBadge, CloseIcon } from "@/shared/ui";
import { ACCENT_COLORS } from "@/shared/constants/colors";
import { cn } from "@/shared/lib/cn";
import { GalleryLightbox, CLOSE_TRANSITION, type LightboxRect } from "./GalleryLightbox";
import { createImageBackdrop } from "./imageBackdrop";
import { useGalleryTilt } from "./useGalleryTilt";
import styles from "./ShowcaseModal.module.scss";

const GALLERY_PREVIEW_COUNT = 3;

type Tab = "overview" | "gallery";

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
    src,
    alt,
    scrollRoot,
    enabled,
}: {
    src: string;
    alt: string;
    scrollRoot: RefObject<HTMLDivElement | null>;
    enabled: boolean;
}) {
    const imageRef = useRef<HTMLDivElement>(null);
    const [poster, setPoster] = useState<string>();
    const inView = useInView(imageRef, { root: scrollRoot, margin: "200px 0px" });
    const animated = /\.gif(?:[?#]|$)/i.test(src);

    const handleImageLoad = (image: HTMLImageElement) => {
        if (!image.naturalWidth || !image.naturalHeight) return;
        createImageBackdrop(src, image);

        if (animated && !poster) {
            const canvas = document.createElement("canvas");
            const context = canvas.getContext("2d");
            if (!context) return;

            const posterScale = Math.min(
                1,
                750 / Math.max(image.naturalWidth, image.naturalHeight)
            );
            canvas.width = Math.max(1, Math.round(image.naturalWidth * posterScale));
            canvas.height = Math.max(1, Math.round(image.naturalHeight * posterScale));
            context.drawImage(image, 0, 0, canvas.width, canvas.height);
            setPoster(canvas.toDataURL("image/webp", 0.85));
        }
    };

    return (
        <div ref={imageRef} className={styles.tileImages}>
            {enabled && inView && (
                <>
                    {poster && (
                        <Image
                            src={poster}
                            alt=""
                            aria-hidden="true"
                            fill
                            unoptimized
                            className={cn(styles.previewImage, styles.previewImagePoster)}
                            draggable={false}
                        />
                    )}
                    <Image
                        src={src}
                        alt={alt}
                        fill
                        sizes="50vw"
                        loading="eager"
                        unoptimized={animated}
                        className={cn(styles.previewImage, animated && styles.previewImageAnimated)}
                        onLoad={(event) => handleImageLoad(event.currentTarget)}
                        draggable={false}
                    />
                </>
            )}
        </div>
    );
}

// == ModalContent =========================================

interface ModalContentProps {
    item: ShowcaseItem;
    onClose: () => void;
}

function ModalContent({ item, onClose }: ModalContentProps) {
    const t = useTranslations("modal");
    const color = ACCENT_COLORS[item.color ?? "purple"];
    const hasGallery = item.gallery.length > 0;
    const [tab, setTab] = useState<Tab>("overview");
    // Separate from `tab`: `tab` flips the active-tab underline instantly
    // (immediate click feedback), while `contentTab` - which actually
    // swaps the rendered panel - waits until the scroll-to-top below has
    // finished. Swapping the DOM mid-scroll is what caused the jump.
    const [contentTab, setContentTab] = useState<Tab>("overview");
    const tools = (item.tools ?? []).map(getToolBadge).filter((badge) => badge !== undefined);
    const previewImages = item.gallery.slice(0, GALLERY_PREVIEW_COUNT);
    const galleryRows = chunk(
        item.gallery.map((image, index) => ({ image, index })),
        GALLERY_PREVIEW_COUNT
    );
    const modalRef = useRef<HTMLDivElement>(null);
    const bodyRef = useRef<HTMLDivElement>(null);
    const tabsRef = useRef<HTMLDivElement>(null);
    const galleryElRefs = useRef<Map<number, HTMLElement>>(new Map());
    const [lightbox, setLightbox] = useState<LightboxState | null>(null);
    // GalleryLightbox stays mounted for its ~400ms shrink-back animation
    // after the user clicks close, but the background preview tiles
    // shouldn't wait that long to start re-rendering their images - flip
    // this the moment the close animation *starts*, not when it ends,
    // so tiles have time to load before the shrink finishes.
    const [lightboxClosing, setLightboxClosing] = useState(false);
    const registerTile = useGalleryTilt(bodyRef, tabsRef);

    // Overview is usually much shorter than a scrolled-down Gallery, so
    // swapping panels while deep in the gallery would otherwise shrink
    // the content mid-scroll and make the browser abruptly clamp
    // scrollTop - a jarring snap. Scroll to the top first, and only swap
    // the panel (contentTab) once that scroll has actually finished.
    const handleTabChange = (nextTab: Tab) => {
        if (nextTab === tab) return;
        setTab(nextTab);

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
        // Fallback in case "scrollend" doesn't fire (unsupported browser,
        // or the scroll gets interrupted).
        window.setTimeout(finish, 500);
        body.scrollTo({ top: 0, behavior: "smooth" });
    };

    useEffect(() => {
        const body = bodyRef.current;
        if (!body) return;

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
    }, []);

    const registerGalleryEl = (index: number) => (el: HTMLElement | null) => {
        if (el) galleryElRefs.current.set(index, el);
        else galleryElRefs.current.delete(index);
    };

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

    const openLightbox = (index: number, e: React.MouseEvent<HTMLElement>) => {
        const modalEl = modalRef.current;
        const tileRect = measureRect(e.currentTarget);
        if (!modalEl || !tileRect) return;

        setLightboxClosing(false);
        setLightbox({
            index,
            launchRect: tileRect,
            fillRect: { top: 0, left: 0, width: modalEl.clientWidth, height: modalEl.clientHeight },
        });
    };

    const getCloseRect = (index: number): LightboxRect | null => {
        const el = galleryElRefs.current.get(index);
        const body = bodyRef.current;
        const modalEl = modalRef.current;
        if (!el || !body || !modalEl) return null;

        // Compute where `el` will land once centered, and animate the
        // background scroll there in step with the lightbox's own
        // shrink-back transition instead of jumping straight there with
        // scrollIntoView(). An instant jump moves the page behind the
        // lightbox to a totally different scroll position in a single
        // frame while the lightbox itself is still smoothly shrinking
        // toward it over ~400ms - the mismatch between "snaps instantly"
        // and "eases in" is what read as a jarring landing. Driving both
        // with the same framer-motion tween + CLOSE_TRANSITION keeps them
        // frame-for-frame identical.
        const elRect = el.getBoundingClientRect();
        const bodyRect = body.getBoundingClientRect();
        const currentAbsoluteTop = elRect.top - bodyRect.top + body.scrollTop;
        const maxScrollTop = Math.max(0, body.scrollHeight - body.clientHeight);
        const targetScrollTop = Math.min(
            maxScrollTop,
            Math.max(0, currentAbsoluteTop - body.clientHeight / 2 + elRect.height / 2)
        );

        const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        animate(body.scrollTop, targetScrollTop, {
            duration: reducedMotion ? 0 : CLOSE_TRANSITION.duration,
            ease: CLOSE_TRANSITION.ease,
            onUpdate: (value) => {
                body.scrollTop = value;
            },
        });

        const modalRect = modalEl.getBoundingClientRect();
        const finalTop = bodyRect.top + (currentAbsoluteTop - targetScrollTop);
        return {
            top: finalTop - modalRect.top,
            left: elRect.left - modalRect.left,
            width: elRect.width,
            height: elRect.height,
        };
    };

    // ESC closes the lightbox first when it's open, the modal itself otherwise.
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key !== "Escape" || lightbox) return;
            onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [lightbox, onClose]);

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
            <div ref={bodyRef} className={styles.body}>
                <div className={styles.banner}>
                    {item.src && (
                        <div className={styles.bannerImageWrap}>
                            <Image
                                src={item.src}
                                alt=""
                                fill
                                className={styles.bannerImage}
                                sizes="(max-width: 1023px) 70vw, 672px"
                                quality={95}
                                priority
                                draggable={false}
                            />
                        </div>
                    )}

                    <button className={styles.close} onClick={onClose} aria-label="Close" autoFocus>
                        <CloseIcon className={styles.closeIcon} />
                    </button>

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
                        >
                            {t("viewWebsite")}
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
                                {t("overviewTab")}
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
                                    {t("galleryTab")}
                                </button>
                            )}
                        </div>
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                        {contentTab === "overview" ? (
                            <m.div
                                key="overview"
                                className={styles.tabPanel}
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            >
                                {previewImages.length > 0 && (
                                    <section className={styles.section}>
                                        <h3 className={styles.sectionLabel}>
                                            {t("galleryPreview")}
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
                                                    ref={registerGalleryEl(index)}
                                                    type="button"
                                                    className={styles.previewItem}
                                                    onClick={(e) => openLightbox(index, e)}
                                                    aria-label={image.alt}
                                                >
                                                    <TileImage
                                                        src={image.src}
                                                        alt={image.alt}
                                                        scrollRoot={bodyRef}
                                                        enabled={!lightbox || lightboxClosing}
                                                    />
                                                </button>
                                            ))}
                                        </div>
                                    </section>
                                )}

                                {tools.length > 0 && (
                                    <section className={styles.section}>
                                        <h3 className={styles.sectionLabel}>{t("tools")}</h3>
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
                                initial={{ opacity: 0, y: 8 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -8 }}
                                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                            >
                                <section className={styles.section}>
                                    <div className={styles.galleryRows}>
                                        {galleryRows.map((row, rowIndex) => (
                                            <div key={rowIndex} className={styles.previewGrid}>
                                                {row.map(({ image, index }) => (
                                                    <button
                                                        key={image.src}
                                                        ref={(el) => {
                                                            registerGalleryEl(index)(el);
                                                            registerTile(index)(el);
                                                        }}
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
                                                            alt={image.alt}
                                                            scrollRoot={bodyRef}
                                                            enabled={!lightbox || lightboxClosing}
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
                    initialIndex={lightbox.index}
                    launchRect={lightbox.launchRect}
                    fillRect={lightbox.fillRect}
                    getCloseRect={getCloseRect}
                    onCloseStart={() => setLightboxClosing(true)}
                    onClose={() => {
                        setLightbox(null);
                        setLightboxClosing(false);
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
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
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
}

export function ShowcaseModal({ item, onClose }: ShowcaseModalProps) {
    const mounted = useMounted();

    useEffect(() => {
        if (!item) return;

        const html = document.documentElement;
        const body = document.body;
        const scrollbarWidth = window.innerWidth - html.clientWidth;

        const previousHtmlOverflow = html.style.overflow;
        const previousBodyOverflow = body.style.overflow;
        const previousHtmlPaddingRight = html.style.paddingRight;

        html.style.overflow = "hidden";
        body.style.overflow = "hidden";

        if (scrollbarWidth > 0) {
            html.style.paddingRight = `${scrollbarWidth}px`;
        }

        return () => {
            html.style.overflow = previousHtmlOverflow;
            body.style.overflow = previousBodyOverflow;
            html.style.paddingRight = previousHtmlPaddingRight;
        };
    }, [item]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {item && (
                <m.div
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                >
                    <div className={styles.overlayInner} onClick={onClose}>
                        <ModalContent key={item.id} item={item} onClose={onClose} />
                    </div>
                </m.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
