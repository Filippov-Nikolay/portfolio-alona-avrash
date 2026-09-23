"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import type { ShowcaseGalleryImage } from "../../types/showcase";
import { CloseIcon } from "../../icons";
import { computeGallerySlots, type GallerySlot } from "./gallerySlots";
import { GalleryImages } from "./galleryImages";
import { fitImage, flipFrames, type LightboxRect } from "./lightboxGeometry";
import styles from "./GalleryLightbox.module.scss";

export type { LightboxRect } from "./lightboxGeometry";

interface GalleryLightboxProps {
    images: ShowcaseGalleryImage[];
    imagePool: GalleryImages;
    initialIndex: number;
    launchRect: LightboxRect;
    fillRect: LightboxRect;
    prepareClose: (index: number) => Promise<LightboxRect | null>;
    onOpened: () => void;
    onClose: (index: number) => void;
}

const OPEN_DURATION = 640;
const CLOSE_DURATION = 520;
const RENDER_WINDOW = 1;

function panelRect(slot: GallerySlot, position: number, viewport: LightboxRect): LightboxRect {
    if (slot.type === "single") return viewport;
    const gap = 2;
    if (slot.type === "row") {
        const width = (viewport.width - gap) / 2;
        return { ...viewport, left: viewport.left + position * (width + gap), width };
    }
    const height = (viewport.height - gap) / 2;
    return { ...viewport, top: viewport.top + position * (height + gap), height };
}

function ImageLayer({
    index,
    imagePool,
    rect,
    viewport,
}: {
    index: number;
    imagePool: GalleryImages;
    rect: LightboxRect;
    viewport: LightboxRect;
}) {
    const hostRef = useRef<HTMLDivElement>(null);
    const { left, top, width, height } = rect;
    useLayoutEffect(() => {
        const host = hostRef.current!;
        let cancelled = false;
        const mount = () => {
            if (cancelled) return;
            const image = imagePool.take(index, host);
            const fit = fitImage(image.naturalWidth, image.naturalHeight, {
                left,
                top,
                width,
                height,
            });
            Object.assign(image.style, {
                position: "absolute",
                left: "0",
                top: "0",
                maxWidth: "none",
                width: `${fit.width}px`,
                height: `${fit.height}px`,
                transformOrigin: "0 0",
                objectFit: "fill",
                transform: `translate3d(${fit.left - viewport.left}px, ${fit.top - viewport.top}px, 0) scale(1, 1)`,
            });
        };
        if (imagePool.get(index).decoded) mount();
        else
            void imagePool
                .decode(index)
                .then(mount)
                .catch(() => {
                    if (!cancelled) host.textContent = imagePool.get(index).element.alt;
                });
        return () => {
            cancelled = true;
            imagePool.release(index);
        };
    }, [index, imagePool, left, top, width, height, viewport.left, viewport.top]);
    return <div ref={hostRef} className={styles.imageLayer} data-image-layer={index} />;
}

export function GalleryLightbox({
    images,
    imagePool,
    initialIndex,
    launchRect,
    fillRect,
    prepareClose,
    onOpened,
    onClose,
}: GalleryLightboxProps) {
    const slots = useMemo(() => computeGallerySlots(images), [images]);
    const initialSlot = slots.findIndex((slot) =>
        slot.images.some((image) => image.originalIndex === initialIndex)
    );
    const [viewport, setViewport] = useState(fillRect);
    const [phase, setPhase] = useState<"opening" | "open" | "preparing-close" | "closing">(
        "opening"
    );
    const [ready, setReady] = useState(false);
    const [center, setCenter] = useState(initialSlot);
    const frameRef = useRef<HTMLDivElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const rootRef = useRef<HTMLDivElement>(null);
    const closeButtonRef = useRef<HTMLButtonElement>(null);
    const animations = useRef<Animation[]>([]);
    const deferredFrame = useRef(0);
    const closing = useRef(false);
    const alive = useRef(true);
    const reduceMotion = useReducedMotion();
    const callbacks = useRef({ prepareClose, onOpened, onClose });
    useLayoutEffect(() => {
        callbacks.current = { prepareClose, onOpened, onClose };
    });

    useLayoutEffect(() => {
        alive.current = true;
        const frame = frameRef.current!;
        const image = imagePool.get(initialIndex).element;
        const slot = slots[initialSlot];
        const position = slot.images.findIndex((item) => item.originalIndex === initialIndex);
        const destination = fitImage(
            image.naturalWidth,
            image.naturalHeight,
            panelRect(slot, position, viewport)
        );
        const source = fitImage(image.naturalWidth, image.naturalHeight, launchRect, true);
        const keyframes = flipFrames(
            viewport,
            launchRect,
            viewport,
            source,
            destination,
            destination.width,
            destination.height
        );
        const options = {
            duration: reduceMotion ? 0 : OPEN_DURATION,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "both" as const,
        };
        const frameAnimation = frame.animate(keyframes.frame, options);
        const imageAnimation = image.animate(keyframes.image, options);
        animations.current = [frameAnimation, imageAnimation];
        closeButtonRef.current?.focus({ preventScroll: true });
        void Promise.all(animations.current.map((animation) => animation.finished))
            .then(() => {
                if (!alive.current || closing.current) return;
                // CSS matches the endpoints. Keep the same frame, host and image,
                // then leave a paint between the transition and gallery initialization.
                frameAnimation.cancel();
                imageAnimation.cancel();
                setPhase("open");
                deferredFrame.current = requestAnimationFrame(() => {
                    deferredFrame.current = requestAnimationFrame(() => {
                        if (closing.current) return;
                        setReady(true);
                        callbacks.current.onOpened();
                    });
                });
            })
            .catch(() => {
                /* Cancelled by close or unmount. */
            });
        return () => {
            alive.current = false;
            cancelAnimationFrame(deferredFrame.current);
            animations.current.forEach((animation) => animation.cancel());
        };
        // The entrance uses a snapshot of the source and launch geometry.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useLayoutEffect(() => {
        if (ready && scrollRef.current) scrollRef.current.scrollTop = center * viewport.height;
        // Preserve the current slot when the viewport resizes; normal scrolling
        // must not snap whenever center changes.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [ready, viewport.height]);

    useEffect(() => {
        if (phase !== "open") return;
        const modal = rootRef.current?.parentElement;
        if (!modal) return;
        const observer = new ResizeObserver(() => {
            if (closing.current) return;
            const width = modal.clientWidth;
            const height = modal.clientHeight;
            setViewport((previous) =>
                previous.width === width && previous.height === height
                    ? previous
                    : { ...previous, width, height }
            );
        });
        observer.observe(modal);
        return () => observer.disconnect();
    }, [phase]);

    const updateScroll = () => {
        if (closing.current || !scrollRef.current) return;
        const position = scrollRef.current.scrollTop / viewport.height;
        const nearest = Math.min(slots.length - 1, Math.max(0, Math.round(position)));
        setCenter((previous) => (previous === nearest ? previous : nearest));
        frameRef.current?.querySelectorAll<HTMLElement>("[data-slot]").forEach((layer) => {
            const index = Number(layer.dataset.slot);
            const covered = Math.min(1, Math.max(0, position - index));
            layer.style.transform = `translate3d(0, ${Math.max(0, index - position) * viewport.height}px, 0) scale(${1 - covered * 0.12})`;
            layer.style.visibility = Math.abs(index - position) <= 1.01 ? "visible" : "hidden";
        });
    };
    useLayoutEffect(() => {
        if (ready) updateScroll();
    });

    const requestClose = async () => {
        if (closing.current) return;
        closing.current = true;
        cancelAnimationFrame(deferredFrame.current);
        setPhase("preparing-close");
        // Interrupted opening keeps its current compositor state while the
        // destination tile is prepared, before any closing animation starts.
        animations.current.forEach((animation) => {
            if (animation.playState === "running") animation.pause();
        });
        const slotIndex =
            ready && scrollRef.current
                ? Math.min(
                      slots.length - 1,
                      Math.max(0, Math.round(scrollRef.current.scrollTop / viewport.height))
                  )
                : initialSlot;
        const slot = slots[slotIndex];
        const index =
            slot.images.find((item) => item.originalIndex === initialIndex)?.originalIndex ??
            slot.images[0].originalIndex;
        const target = (await callbacks.current.prepareClose(index)) ?? launchRect;
        if (!alive.current) return;
        const frame = frameRef.current!;
        const image = imagePool.get(index).element;
        if (!frame.contains(image)) {
            try {
                await imagePool.decode(index);
            } catch {
                callbacks.current.onClose(index);
                return;
            }
            await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
            if (!alive.current) return;
        }
        if (!frame.contains(image)) {
            callbacks.current.onClose(index);
            return;
        }
        const rootBounds = rootRef.current!.getBoundingClientRect();
        const relative = (rect: DOMRect): LightboxRect => ({
            left: rect.left - rootBounds.left + viewport.left,
            top: rect.top - rootBounds.top + viewport.top,
            width: rect.width,
            height: rect.height,
        });
        const fromFrame = relative(frame.getBoundingClientRect());
        const fromImage = relative(image.getBoundingClientRect());
        const width = parseFloat(image.style.width);
        const height = parseFloat(image.style.height);
        animations.current.forEach((animation) => animation.cancel());
        frame.querySelectorAll<HTMLElement>("[data-slot]").forEach((layer) => {
            layer.style.transform = "none";
            layer.style.visibility =
                Number(layer.dataset.slot) === slotIndex ? "visible" : "hidden";
        });
        frame.querySelectorAll<HTMLElement>("[data-image-layer]").forEach((layer) => {
            layer.style.visibility =
                Number(layer.dataset.imageLayer) === index ? "visible" : "hidden";
        });
        const destination = fitImage(image.naturalWidth, image.naturalHeight, target, true);
        const keyframes = flipFrames(
            viewport,
            fromFrame,
            target,
            fromImage,
            destination,
            width,
            height
        );
        const options = {
            duration: reduceMotion ? 0 : CLOSE_DURATION,
            easing: "cubic-bezier(0.65, 0, 0.25, 1)",
            fill: "both" as const,
        };
        animations.current = [
            frame.animate(keyframes.frame, options),
            image.animate(keyframes.image, options),
        ];
        setPhase("closing");
        void Promise.all(animations.current.map((animation) => animation.finished))
            .then(() => {
                if (alive.current) callbacks.current.onClose(index);
            })
            .catch(() => {
                /* Unmounted. */
            });
    };
    const closeRef = useRef(requestClose);
    useLayoutEffect(() => {
        closeRef.current = requestClose;
    });
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                event.preventDefault();
                void closeRef.current();
            }
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, []);

    return (
        <div
            ref={rootRef}
            className={styles.lightbox}
            data-testid="gallery-lightbox"
            data-phase={phase}
            style={{
                top: viewport.top,
                left: viewport.left,
                width: viewport.width,
                height: viewport.height,
            }}
        >
            <div ref={frameRef} className={styles.frame} data-lightbox-frame>
                {slots.map((slot, slotIndex) => {
                    if (
                        slotIndex !== initialSlot &&
                        (!ready || Math.abs(slotIndex - center) > RENDER_WINDOW)
                    )
                        return null;
                    return (
                        <div
                            key={slotIndex}
                            className={styles.slot}
                            data-slot={slotIndex}
                            style={{ zIndex: slotIndex + 1 }}
                        >
                            {slot.images.map(({ originalIndex }, position) => {
                                if (!ready && originalIndex !== initialIndex) return null;
                                return (
                                    <ImageLayer
                                        key={originalIndex}
                                        index={originalIndex}
                                        imagePool={imagePool}
                                        rect={panelRect(slot, position, viewport)}
                                        viewport={viewport}
                                    />
                                );
                            })}
                        </div>
                    );
                })}
            </div>
            {ready && (
                <div
                    ref={scrollRef}
                    className={styles.scrollArea}
                    onScroll={updateScroll}
                    data-gallery-scroll
                    tabIndex={0}
                    aria-label="Gallery images"
                    inert={phase !== "open"}
                >
                    <div style={{ height: slots.length * viewport.height }} />
                </div>
            )}
            <button
                ref={closeButtonRef}
                type="button"
                className={styles.close}
                onClick={() => void requestClose()}
                aria-label="Close"
            >
                <CloseIcon className={styles.closeIcon} />
            </button>
            {ready && slots.length > 1 && (
                <div className={styles.progress} role="group" aria-label="Gallery images">
                    {slots.map((slot, index) => (
                        <button
                            key={index}
                            type="button"
                            className={styles.progressSegment}
                            aria-label={slot.images.map((item) => item.image.alt).join(" / ")}
                            aria-current={index === center ? "true" : undefined}
                            onClick={() =>
                                scrollRef.current?.scrollTo({
                                    top: index * viewport.height,
                                    behavior: reduceMotion ? "auto" : "smooth",
                                })
                            }
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
