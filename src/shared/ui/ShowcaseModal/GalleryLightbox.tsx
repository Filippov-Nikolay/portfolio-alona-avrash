"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import Image from "next/image";
import { m, useMotionValueEvent, useScroll, useTransform, type MotionValue } from "framer-motion";
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

    useMotionValueEvent(scrollYProgress, "change", (v) => {
        const nearest = Math.min(total - 1, Math.max(0, Math.round(v * (total - 1))));
        setCenterIndex((prev) => (prev === nearest ? prev : nearest));
    });

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = initialIndex * el.clientHeight;
    }, []);

    return (
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
