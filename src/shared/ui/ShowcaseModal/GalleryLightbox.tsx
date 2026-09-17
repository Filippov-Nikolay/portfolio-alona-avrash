"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import {
    m,
    useMotionValueEvent,
    useReducedMotion,
    useScroll,
    useSpring,
    useTransform,
    type MotionValue,
} from "framer-motion";
import type { ShowcaseGalleryImage } from "@/shared/types";
import { CloseIcon } from "@/shared/ui";
import { createImageBackdrop, getImageBackdrop } from "./imageBackdrop";
import styles from "./GalleryLightbox.module.scss";

export interface LightboxRect {
    top: number;
    left: number;
    width: number;
    height: number;
}

interface GalleryLightboxProps {
    images: ShowcaseGalleryImage[];
    initialIndex: number;
    launchRect: LightboxRect;
    fillRect: LightboxRect;

    getCloseRect: (index: number) => LightboxRect | null;
    // Fires the moment the close animation starts (not when it finishes,
    // unlike onClose) so callers can react immediately - e.g. re-enabling
    // background tiles to load while this is still shrinking.
    onCloseStart?: () => void;
    onClose: () => void;
}

const TILE_RADIUS_PX = 12;
const OPEN_TRANSITION = { duration: 0.55, ease: [0.22, 1, 0.36, 1] as const };
// Exported so the background scroll-into-place (driven from
// ShowcaseModal) can use the exact same duration/easing - two
// independently-timed animations drifting apart is what caused the
// mismatched landing this used to have.
export const CLOSE_TRANSITION = { duration: 0.4, ease: [0.65, 0, 0.25, 1] as const };
const RENDER_WINDOW = 2;
const PROGRESS_SPRING = { stiffness: 460, damping: 38, mass: 0.45 };

function FramedImage({ src, alt }: { src: string; alt: string }) {
    const [backdrop, setBackdrop] = useState(() => getImageBackdrop(src));

    return (
        <>
            {backdrop && (
                <Image
                    src={backdrop}
                    alt=""
                    aria-hidden="true"
                    fill
                    unoptimized
                    loading="eager"
                    className={styles.imageBackdrop}
                    draggable={false}
                />
            )}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src={src}
                alt={alt}
                className={styles.imageForeground}
                draggable={false}
                loading="lazy"
                decoding="async"
                onLoad={(event) => setBackdrop(createImageBackdrop(src, event.currentTarget))}
            />
        </>
    );
}

function StackItem({
    image,
    index,
    total,
    scrollYProgress,
    render,
}: {
    image: ShowcaseGalleryImage;
    index: number;
    total: number;
    scrollYProgress: MotionValue<number>;
    render: boolean;
}) {
    const scrollSegments = Math.max(total - 1, 1);
    const ownSlotStart = index / scrollSegments;
    const ownSlotEnd = (index + 1) / scrollSegments;
    const covered = useTransform(scrollYProgress, [ownSlotStart, ownSlotEnd], [0, 1], {
        clamp: true,
    });
    const scale = useTransform(covered, [0, 1], [1, 0.88]);
    const opacity = useTransform(covered, [0, 1], [1, 0.4]);

    return (
        <div className={styles.slot}>
            <m.div className={styles.sticky} style={{ scale, opacity, zIndex: index + 1 }}>
                {render && <FramedImage src={image.src} alt={image.alt} />}
            </m.div>
        </div>
    );
}

function ProgressSegment({
    image,
    index,
    total,
    active,
    scrollYProgress,
    onSelect,
}: {
    image: ShowcaseGalleryImage;
    index: number;
    total: number;
    active: boolean;
    scrollYProgress: MotionValue<number>;
    onSelect: () => void;
}) {
    const reduceMotion = useReducedMotion();
    const compact = total > 22;
    const shortWidth = compact ? 6 : total > 16 ? 7 : 9;
    const longWidth = compact ? 24 : total > 16 ? 28 : 32;

    const targetWidth = useTransform(scrollYProgress, (progress) => {
        const visualIndex = progress * Math.max(total - 1, 1);
        const proximity = Math.max(0, 1 - Math.abs(visualIndex - index));
        return shortWidth + (longWidth - shortWidth) * proximity;
    });
    const targetOpacity = useTransform(scrollYProgress, (progress) => {
        const visualIndex = progress * Math.max(total - 1, 1);
        const proximity = Math.max(0, 1 - Math.abs(visualIndex - index));
        return 0.34 + 0.66 * proximity;
    });
    const springWidth = useSpring(targetWidth, PROGRESS_SPRING);
    const springOpacity = useSpring(targetOpacity, PROGRESS_SPRING);

    return (
        <m.button
            type="button"
            className={styles.progressSegment}
            style={{
                width: reduceMotion ? targetWidth : springWidth,
                opacity: reduceMotion ? targetOpacity : springOpacity,
            }}
            onClick={onSelect}
            aria-label={image.alt}
            aria-current={active ? "true" : undefined}
        />
    );
}

function LightboxStack({
    images,
    initialIndex,
    scrollRef,
}: {
    images: ShowcaseGalleryImage[];
    initialIndex: number;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
    const total = images.length;
    const { scrollYProgress } = useScroll({ container: scrollRef });
    const [centerIndex, setCenterIndex] = useState(initialIndex);
    const reduceMotion = useReducedMotion();

    useMotionValueEvent(scrollYProgress, "change", (v) => {
        const nearest = Math.min(total - 1, Math.max(0, Math.round(v * (total - 1))));
        setCenterIndex((prev) => (prev === nearest ? prev : nearest));
    });

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = initialIndex * el.clientHeight;
    }, [initialIndex, scrollRef]);

    const scrollToImage = (index: number) => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTo({
            top: index * el.clientHeight,
            behavior: reduceMotion ? "auto" : "smooth",
        });
    };

    return (
        <>
            <div ref={scrollRef} className={styles.scrollArea}>
                {images.map((image, index) => (
                    <StackItem
                        key={image.src}
                        image={image}
                        index={index}
                        total={total}
                        scrollYProgress={scrollYProgress}
                        render={Math.abs(index - centerIndex) <= RENDER_WINDOW}
                    />
                ))}
            </div>

            {total > 1 && (
                <m.div
                    className={styles.progress}
                    data-compact={total > 22 || undefined}
                    initial={reduceMotion ? false : { opacity: 0, x: "-50%", y: 8 }}
                    animate={{ opacity: 1, x: "-50%", y: 0 }}
                    transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
                    role="group"
                    aria-label="Gallery images"
                >
                    {images.map((image, index) => (
                        <ProgressSegment
                            key={image.src}
                            image={image}
                            index={index}
                            total={total}
                            active={index === centerIndex}
                            scrollYProgress={scrollYProgress}
                            onSelect={() => scrollToImage(index)}
                        />
                    ))}
                </m.div>
            )}
        </>
    );
}

export function GalleryLightbox({
    images,
    initialIndex,
    launchRect,
    fillRect,
    getCloseRect,
    onCloseStart,
    onClose,
}: GalleryLightboxProps) {
    const [phase, setPhase] = useState<"opening" | "open" | "closing">("opening");
    const [closeRect, setCloseRect] = useState<LightboxRect | null>(null);
    const [closeIndex, setCloseIndex] = useState(initialIndex);
    const scrollRef = useRef<HTMLDivElement>(null);

    const requestClose = () => {
        const el = scrollRef.current;
        const index = el
            ? Math.min(images.length - 1, Math.max(0, Math.round(el.scrollTop / el.clientHeight)))
            : initialIndex;
        setCloseIndex(index);
        setCloseRect(getCloseRect(index) ?? launchRect);
        setPhase("closing");
        onCloseStart?.();
    };

    const requestCloseRef = useRef(requestClose);
    useEffect(() => {
        requestCloseRef.current = requestClose;
    });

    useEffect(() => {
        if (phase !== "closing") return;
        const id = window.setTimeout(onClose, CLOSE_TRANSITION.duration * 1000);
        return () => window.clearTimeout(id);
    }, [phase, onClose]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") requestCloseRef.current();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);

    const rect = phase === "closing" ? (closeRect ?? launchRect) : fillRect;

    return (
        <m.div
            className={styles.lightbox}
            initial={{
                top: launchRect.top,
                left: launchRect.left,
                width: launchRect.width,
                height: launchRect.height,
                borderRadius: TILE_RADIUS_PX,
            }}
            animate={{
                top: rect.top,
                left: rect.left,
                width: rect.width,
                height: rect.height,
                borderRadius: phase === "closing" ? TILE_RADIUS_PX : 0,
            }}
            transition={phase === "closing" ? CLOSE_TRANSITION : OPEN_TRANSITION}
            onAnimationComplete={() => {
                if (phase === "opening") setPhase("open");
            }}
        >
            <button
                type="button"
                className={styles.close}
                onClick={requestClose}
                aria-label="Close"
            >
                <CloseIcon className={styles.closeIcon} />
            </button>

            {phase === "open" ? (
                <LightboxStack images={images} initialIndex={initialIndex} scrollRef={scrollRef} />
            ) : (
                <FramedImage
                    src={images[phase === "closing" ? closeIndex : initialIndex].src}
                    alt={images[phase === "closing" ? closeIndex : initialIndex].alt}
                />
            )}
        </m.div>
    );
}
