"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import type { ShowcaseItem } from "@/shared/types";
import { useMounted } from "@/shared/hooks/useMounted";
import { Button, ArrowIcon, ToolBadge, getToolBadge, CloseIcon } from "@/shared/ui";
import { ACCENT_COLORS } from "@/shared/constants/colors";
import { cn } from "@/shared/lib/cn";
import { GalleryLightbox, type LightboxRect } from "./GalleryLightbox";
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

function TileImage({ src, alt }: { src: string; alt: string }) {
    return (
        <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt=""
                aria-hidden="true"
                className={styles.previewImageBackdrop}
                draggable={false}
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={src} alt={alt} className={styles.previewImage} draggable={false} />
        </>
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
    const tools = (item.tools ?? []).map(getToolBadge).filter((badge) => badge !== undefined);
    const previewImages = item.gallery.slice(0, GALLERY_PREVIEW_COUNT);
    const galleryRows = chunk(
        item.gallery.map((image, index) => ({ image, index })),
        GALLERY_PREVIEW_COUNT
    );
    const modalRef = useRef<HTMLDivElement>(null);
    const galleryElRefs = useRef<Map<number, HTMLElement>>(new Map());
    const [lightbox, setLightbox] = useState<LightboxState | null>(null);

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

        setLightbox({
            index,
            launchRect: tileRect,
            fillRect: { top: 0, left: 0, width: modalEl.clientWidth, height: modalEl.clientHeight },
        });
    };

    const getCloseRect = (index: number): LightboxRect | null => {
        const el = galleryElRefs.current.get(index);
        if (!el) return null;
        el.scrollIntoView({ block: "center", inline: "nearest" });
        return measureRect(el);
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
            <div className={styles.body}>
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
                    <div className={styles.tabs} role="tablist">
                        <button
                            type="button"
                            role="tab"
                            aria-selected={tab === "overview"}
                            className={cn(styles.tab, tab === "overview" && styles.tabActive)}
                            onClick={() => setTab("overview")}
                        >
                            {t("overviewTab")}
                        </button>
                        {hasGallery && (
                            <button
                                type="button"
                                role="tab"
                                aria-selected={tab === "gallery"}
                                className={cn(styles.tab, tab === "gallery" && styles.tabActive)}
                                onClick={() => setTab("gallery")}
                            >
                                {t("galleryTab")}
                            </button>
                        )}
                    </div>

                    <AnimatePresence mode="wait" initial={false}>
                        {tab === "overview" ? (
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
                                        <div className={styles.previewGrid}>
                                            {previewImages.map((image, index) => (
                                                <button
                                                    key={image.src}
                                                    ref={registerGalleryEl(index)}
                                                    type="button"
                                                    className={styles.previewItem}
                                                    onClick={(e) => openLightbox(index, e)}
                                                    aria-label={image.alt}
                                                >
                                                    <TileImage src={image.src} alt={image.alt} />
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
                                                        ref={registerGalleryEl(index)}
                                                        type="button"
                                                        className={styles.previewItem}
                                                        onClick={(e) => openLightbox(index, e)}
                                                        aria-label={image.alt}
                                                    >
                                                        <TileImage
                                                            src={image.src}
                                                            alt={image.alt}
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
                    onClose={() => setLightbox(null)}
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
