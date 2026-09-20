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
    type TargetAndTransition,
} from "framer-motion";
import type { ShowcaseGalleryImage } from "../../types/showcase";
import { CloseIcon } from "../../icons";
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
    transitionSrc?: string;

    getCloseRect: (index: number) => LightboxRect | null;
    onClose: () => void;
}

const TILE_RADIUS_PX = 12;
const OPEN_TRANSITION = { duration: 0.64, ease: [0.22, 1, 0.36, 1] as const };
export const CLOSE_TRANSITION = { duration: 0.52, ease: [0.65, 0, 0.25, 1] as const };
const RENDER_WINDOW = 2;
const PROGRESS_SPRING = { stiffness: 460, damping: 38, mass: 0.45 };

function FramedImage({
    src,
    alt,
    eager = false,
    fit = "contain",
}: {
    src: string;
    alt: string;
    eager?: boolean;
    fit?: "contain" | "cover";
}) {
    return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
            src={src}
            alt={alt}
            className={`${styles.imageForeground} ${fit === "cover" ? styles.imageCover : ""}`}
            draggable={false}
            loading={eager ? "eager" : "lazy"}
            decoding="async"
        />
    );
}

function FitMorphImage({
    src,
    alt,
    phase,
}: {
    src: string;
    alt: string;
    phase: "opening" | "closing";
}) {
    const opening = phase === "opening";
    const transition = {
        duration: opening ? 0.34 : 0.3,
        delay: opening ? 0.1 : 0.08,
        ease: [0.4, 0, 0.2, 1] as const,
    };

    return (
        <div className={styles.fitMorph}>
            <m.div
                className={styles.fitLayer}
                initial={{ opacity: opening ? 1 : 0 }}
                animate={{ opacity: opening ? 0 : 1 }}
                transition={transition}
                aria-hidden="true"
            >
                <FramedImage src={src} alt="" eager fit="cover" />
            </m.div>
            <m.div
                className={styles.fitLayer}
                initial={{ opacity: opening ? 0 : 1 }}
                animate={{ opacity: opening ? 1 : 0 }}
                transition={transition}
            >
                <FramedImage src={src} alt={alt} eager />
            </m.div>
        </div>
    );
}

const FULL_FRAME: TargetAndTransition = {
    top: "0%",
    left: "0%",
    width: "100%",
    height: "100%",
};

function getPairFrame(type: "row" | "stack", position: number): TargetAndTransition {
    if (type === "row") {
        return {
            top: "0%",
            left: position === 0 ? "0%" : "50%",
            width: "50%",
            height: "100%",
        };
    }

    return {
        top: position === 0 ? "0%" : "50%",
        left: "0%",
        width: "100%",
        height: "50%",
    };
}

function getCollapsedFrame(type: "row" | "stack", position: number): TargetAndTransition {
    if (type === "row") {
        return {
            top: "0%",
            left: position === 0 ? "0%" : "100%",
            width: "0%",
            height: "100%",
        };
    }

    return {
        top: position === 0 ? "0%" : "100%",
        left: "0%",
        width: "100%",
        height: "0%",
    };
}

function TransitionSlotContent({
    slot,
    anchorIndex,
    phase,
    transitionSrc,
}: {
    slot: GallerySlot;
    anchorIndex: number;
    phase: "opening" | "closing";
    transitionSrc?: string;
}) {
    if (slot.type === "single") {
        const { image } = slot.images[0];
        return (
            <FitMorphImage
                src={phase === "opening" ? (transitionSrc ?? image.src) : image.src}
                alt={image.alt}
                phase={phase}
            />
        );
    }

    const anchorPosition = Math.max(
        0,
        slot.images.findIndex(({ originalIndex }) => originalIndex === anchorIndex)
    );
    const opening = phase === "opening";

    return (
        <div className={styles.transitionPair}>
            {slot.images.map(({ image, originalIndex }, position) => {
                const anchor = position === anchorPosition;
                const pairFrame = getPairFrame(slot.type, position);
                const hiddenFrame = anchor ? FULL_FRAME : getCollapsedFrame(slot.type, position);

                return (
                    <m.div
                        key={originalIndex}
                        className={styles.transitionPanel}
                        initial={opening ? hiddenFrame : pairFrame}
                        animate={opening ? pairFrame : hiddenFrame}
                        transition={
                            opening
                                ? {
                                      duration: anchor ? 0.5 : 0.46,
                                      delay: anchor ? 0.08 : 0.12,
                                      ease: [0.22, 1, 0.36, 1],
                                  }
                                : {
                                      duration: anchor ? 0.36 : 0.28,
                                      ease: [0.65, 0, 0.25, 1],
                                  }
                        }
                    >
                        <m.div
                            className={styles.transitionImage}
                            initial={opening && !anchor ? { opacity: 0 } : { opacity: 1 }}
                            animate={opening || anchor ? { opacity: 1 } : { opacity: 0 }}
                            transition={
                                opening
                                    ? { duration: 0.3, delay: anchor ? 0 : 0.16 }
                                    : { duration: anchor ? 0 : 0.2 }
                            }
                        >
                            {anchor ? (
                                <FitMorphImage
                                    src={
                                        phase === "opening"
                                            ? (transitionSrc ?? image.src)
                                            : image.src
                                    }
                                    alt={image.alt}
                                    phase={phase}
                                />
                            ) : (
                                <FramedImage src={image.src} alt={image.alt} eager />
                            )}
                        </m.div>
                    </m.div>
                );
            })}
            <m.div
                className={styles.transitionDivider}
                data-orientation={slot.type}
                initial={{ opacity: opening ? 0 : 1 }}
                animate={{ opacity: opening ? 1 : 0 }}
                transition={
                    opening
                        ? { duration: 0.24, delay: 0.32, ease: "easeOut" }
                        : { duration: 0.16, ease: "easeOut" }
                }
            />
        </div>
    );
}

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
    transitionSrc,
    getCloseRect,
    onClose,
}: GalleryLightboxProps) {
    const [phase, setPhase] = useState<"opening" | "open" | "closing">("opening");
    const [closeRect, setCloseRect] = useState<LightboxRect | null>(null);
    const [closeIndex, setCloseIndex] = useState(initialIndex);
    const [closeSlotIndex, setCloseSlotIndex] = useState(0);
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
        const slot = slots[slotIndex];
        const index =
            slot?.images.find(({ originalIndex }) => originalIndex === initialIndex)
                ?.originalIndex ??
            slot?.images[0]?.originalIndex ??
            initialIndex;
        setCloseSlotIndex(slotIndex);
        setCloseIndex(index);
        setCloseRect(getCloseRect(index) ?? launchRect);
        setPhase("closing");
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

    const toTransform = (rect: LightboxRect) => ({
        x: rect.left - fillRect.left,
        y: rect.top - fillRect.top,
        scaleX: rect.width / fillRect.width,
        scaleY: rect.height / fillRect.height,
    });
    const launchTransform = toTransform(launchRect);
    const targetTransform =
        phase === "closing"
            ? toTransform(closeRect ?? launchRect)
            : { x: 0, y: 0, scaleX: 1, scaleY: 1 };
    const transitionSlot =
        slots[phase === "closing" ? closeSlotIndex : initialSlotIndex] ?? slots[0];
    const transitionAnchorIndex = phase === "closing" ? closeIndex : initialIndex;

    return (
        <m.div
            className={styles.lightbox}
            style={{
                top: fillRect.top,
                left: fillRect.left,
                width: fillRect.width,
                height: fillRect.height,
            }}
            initial={{
                ...launchTransform,
                borderRadius: TILE_RADIUS_PX,
            }}
            animate={{
                ...targetTransform,
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
            ) : transitionSlot ? (
                <TransitionSlotContent
                    slot={transitionSlot}
                    anchorIndex={transitionAnchorIndex}
                    phase={phase}
                    transitionSrc={transitionSrc}
                />
            ) : (
                <FramedImage
                    src={images[transitionAnchorIndex].src}
                    alt={images[transitionAnchorIndex].alt}
                    eager
                />
            )}
        </m.div>
    );
}
