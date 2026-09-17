"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
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
import { computeGallerySlots, type GallerySlot, type GallerySlotImage } from "./gallerySlots";
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
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            className={styles.imageForeground}
            draggable={false}
            loading="lazy"
            decoding="async"
        />
    );
}

// A slot's single image fills the whole sticky frame; a paired slot
// (two portraits side-by-side, or two short/wide images stacked) splits
// the frame in half and gives each image its own contain-fit half, each
// with its own blurred backdrop.
function SlotContent({ slot }: { slot: GallerySlot }) {
    if (slot.type === "single") {
        const { image } = slot.images[0];
        return <FramedImage src={image.src} alt={image.alt} />;
    }

    return (
        <div className={slot.type === "row" ? styles.pairRow : styles.pairStack}>
            {slot.images.map(({ image, originalIndex }) => (
                <div key={originalIndex} className={styles.pairHalf}>
                    <FramedImage src={image.src} alt={image.alt} />
                </div>
            ))}
        </div>
    );
}

function slotKey(slot: GallerySlot) {
    return slot.images.map((slotImage) => slotImage.image.src).join("|");
}

function slotLabel(slot: GallerySlot) {
    return slot.images.map((slotImage) => slotImage.image.alt).join(" / ");
}

function StackSlot({
    slot,
    index,
    total,
    scrollYProgress,
    render,
}: {
    slot: GallerySlot;
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
                {render && <SlotContent slot={slot} />}
            </m.div>
        </div>
    );
}

function ProgressSegment({
    slot,
    index,
    total,
    active,
    scrollYProgress,
    onSelect,
}: {
    slot: GallerySlot;
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
            aria-label={slotLabel(slot)}
            aria-current={active ? "true" : undefined}
        />
    );
}

function LightboxStack({
    slots,
    initialSlotIndex,
    scrollRef,
}: {
    slots: GallerySlot[];
    initialSlotIndex: number;
    scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
    const total = slots.length;
    const { scrollYProgress } = useScroll({ container: scrollRef });
    const [centerIndex, setCenterIndex] = useState(initialSlotIndex);
    const reduceMotion = useReducedMotion();

    useMotionValueEvent(scrollYProgress, "change", (v) => {
        const nearest = Math.min(total - 1, Math.max(0, Math.round(v * (total - 1))));
        setCenterIndex((prev) => (prev === nearest ? prev : nearest));
    });

    useLayoutEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        el.scrollTop = initialSlotIndex * el.clientHeight;
    }, [initialSlotIndex, scrollRef]);

    const scrollToSlot = (index: number) => {
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
                {slots.map((slot, index) => (
                    <StackSlot
                        key={slotKey(slot)}
                        slot={slot}
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
                    {slots.map((slot, index) => (
                        <ProgressSegment
                            key={slotKey(slot)}
                            slot={slot}
                            index={index}
                            total={total}
                            active={index === centerIndex}
                            scrollYProgress={scrollYProgress}
                            onSelect={() => scrollToSlot(index)}
                        />
                    ))}
                </m.div>
            )}
        </>
    );
}

function findSlotIndex(slots: GallerySlot[], originalIndex: number) {
    const index = slots.findIndex((slot) =>
        slot.images.some((slotImage: GallerySlotImage) => slotImage.originalIndex === originalIndex)
    );
    return index === -1 ? 0 : index;
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

    const slots = useMemo(() => computeGallerySlots(images), [images]);
    const initialSlotIndex = useMemo(
        () => findSlotIndex(slots, initialIndex),
        [slots, initialIndex]
    );

    const requestClose = () => {
        const el = scrollRef.current;
        const slotIndex = el
            ? Math.min(slots.length - 1, Math.max(0, Math.round(el.scrollTop / el.clientHeight)))
            : initialSlotIndex;
        // A paired slot holds two original images - report the first as
        // the close target, since that's the one whose grid tile the
        // shrink-back animation should land on.
        const index = slots[slotIndex]?.images[0]?.originalIndex ?? initialIndex;
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
                <LightboxStack
                    slots={slots}
                    initialSlotIndex={initialSlotIndex}
                    scrollRef={scrollRef}
                />
            ) : (
                <FramedImage
                    src={images[phase === "closing" ? closeIndex : initialIndex].src}
                    alt={images[phase === "closing" ? closeIndex : initialIndex].alt}
                />
            )}
        </m.div>
    );
}
