"use client";

import { useEffect, useRef, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { ScrollTrigger, useGSAP, gsap } from "@/shared/lib/gsap";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";

const DESKTOP_CARD_WIDTH = 278;
const MOBILE_CARD_WIDTH = 208;
const FOCUS_X_RATIO = 0.45;
const PASSED_GALLERY_SCALE = 1.12;
const FOCUS_SCALE_BOOST = 0.12;
const FOCUS_DETENT_SCALE = 0.024;
const FOCUS_DETENT_DROP = 4;
const MIN_GALLERY_SCALE = 0.25;
const FOCUS_LEFT_AIR = 40;
const FOCUS_RIGHT_AIR = 40;
const DESKTOP_GALLERY_CORRIDOR_Y = 82;
const MOBILE_GALLERY_CORRIDOR_Y = 16;
const ENTRY_END = 0.12;
const FIVE_ROW_START = 0.79;
const FINAL_HOLD_START = 0.92;
const EXTRA_EXIT_END = FINAL_HOLD_START;
const FINAL_MORPH_START = FIVE_ROW_START;
const FINAL_MORPH_END = FINAL_HOLD_START;
const HANDOFF_TRACK_END = 0.93;
const FINAL_TAIL_TRACK_ADVANCE = 0.25;
const FINAL_COMPOSITION_VISUAL_OFFSET = 20;
const FINAL_STOP_VELOCITY = 1400;
const FINAL_HOLD_SCROLL_DISTANCE = 0.9;

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;
const remap = (value: number, start: number, end: number) => clamp((value - start) / (end - start));
const mapRange = (value: number, start: number, end: number) => (value - start) / (end - start);
const smoothstep = (value: number) => {
    const clamped = clamp(value);
    return clamped * clamped * (3 - 2 * clamped);
};

function useCompactViewport() {
    const [compact, setCompact] = useState(false);

    useEffect(() => {
        const media = window.matchMedia("(max-width: 479px)");
        const update = () => setCompact(media.matches);

        update();
        media.addEventListener("change", update);
        return () => media.removeEventListener("change", update);
    }, []);

    return compact;
}

interface TransformState {
    x: number;
    y: number;
    z: number;
    scale: number;
    rotationY: number;
    zIndex: number;
}

interface CardDepthState {
    scale: number;
    y: number;
    rotationY: number;
}

interface FinalCompositionLayout {
    left: number;
    step: number;
    baseY: number;
    maxRise: number;
    viewAllX: number;
    viewAllY: number;
}

export function useProjectsSectionAnimations() {
    const reduced = useReducedMotion();
    const compact = useCompactViewport();
    const sectionRef = useRef<HTMLElement>(null);
    const sceneRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const viewAllRef = useRef<HTMLAnchorElement>(null);

    useScrollTriggerAutoRefresh([reduced, compact]);

    useGSAP(
        () => {
            const scene = sceneRef.current;
            const title = titleRef.current;
            const viewAll = viewAllRef.current;
            if (!scene || !title || !viewAll) return;

            const cards = gsap.utils.toArray<HTMLElement>("[data-project-card]", scene);
            if (reduced || cards.length === 0) {
                gsap.set([...cards, title, viewAll], { clearProps: "all" });
                return;
            }
            const finalCount = cards.filter(
                (card) => card.dataset.projectInstance === "final-tail"
            ).length;
            const finalTailStart = cards.length - finalCount;
            const cardWidth = compact ? MOBILE_CARD_WIDTH : DESKTOP_CARD_WIDTH;
            const cardHeight = cardWidth;
            const passedCardStep = cardWidth * PASSED_GALLERY_SCALE * 0.9;
            const galleryCorridorY = compact
                ? MOBILE_GALLERY_CORRIDOR_Y
                : DESKTOP_GALLERY_CORRIDOR_Y;

            const getSceneDistance = () => {
                const logicalSteps = Math.max(finalTailStart + 2.6, 6);

                return (
                    Math.max(
                        window.innerHeight * 4.5,
                        logicalSteps * cardWidth * 0.84 + window.innerWidth * 0.35
                    ) +
                    window.innerHeight * FINAL_HOLD_SCROLL_DISTANCE
                );
            };
            const getFocusInfluence = (relative: number) =>
                Math.exp(-(relative * relative) / (2 * 0.42 * 0.42));
            const getFocusDetentInfluence = (relative: number) =>
                Math.exp(-(relative * relative) / (2 * 0.11 * 0.11));
            const getCardDepthState = (relative: number, focusScaleAccent = 1): CardDepthState => {
                const focusInfluence = getFocusInfluence(relative);
                const detentInfluence = getFocusDetentInfluence(relative);
                const scaleAccent =
                    (FOCUS_SCALE_BOOST * focusInfluence + FOCUS_DETENT_SCALE * detentInfluence) *
                    focusScaleAccent;

                if (relative <= 0) {
                    return {
                        scale: PASSED_GALLERY_SCALE + scaleAccent,
                        y:
                            galleryCorridorY +
                            focusInfluence * 8 +
                            FOCUS_DETENT_DROP * detentInfluence,
                        rotationY: 0,
                    };
                }

                // One continuous depth path: two readable medium cards near the focus,
                // followed by a strongly compressed small-card perspective tail.
                const depth = 1 - Math.exp(-relative * 0.82);
                const incomingScale =
                    MIN_GALLERY_SCALE +
                    (PASSED_GALLERY_SCALE - MIN_GALLERY_SCALE) * Math.exp(-relative * 0.43);

                return {
                    scale: incomingScale + scaleAccent,
                    y:
                        galleryCorridorY -
                        depth * 48 +
                        focusInfluence * 8 +
                        FOCUS_DETENT_DROP * detentInfluence,
                    rotationY: -depth * 9,
                };
            };
            const getSpacingDensity = (relative: number) => {
                if (relative <= 0) return passedCardStep;

                const { scale } = getCardDepthState(relative);
                const nearFocus = Math.exp(-relative * 1.1);
                const compressedStep = cardWidth * scale + 10;
                const tailCompression = 0.22 + 0.78 * Math.exp(-Math.max(relative - 1, 0) * 1.15);
                const projectedStep = compressedStep * tailCompression;

                // This is the local screen-space distance per logical card, not a track gap.
                // Its asymptotic compression keeps the full small-card tail inside the viewport.
                return lerp(projectedStep, passedCardStep, nearFocus);
            };
            const getPathDistance = (relative: number) => {
                if (relative === 0) return 0;

                const direction = Math.sign(relative);
                const length = Math.abs(relative);
                const segments = Math.max(12, Math.ceil(length * 18));
                const segmentLength = length / segments;
                let distance = 0;

                for (let segment = 0; segment < segments; segment += 1) {
                    const position = direction * (segment + 0.5) * segmentLength;
                    distance += getSpacingDensity(position) * segmentLength;
                }

                return direction * distance;
            };
            const getFocusCorridorOffset = (relative: number) => {
                if (relative === 0) return 0;

                const settle = 1 - Math.exp(-Math.pow(Math.abs(relative) / 0.32, 2));
                const sideAir = relative < 0 ? FOCUS_LEFT_AIR : FOCUS_RIGHT_AIR;

                return Math.sign(relative) * sideAir * settle;
            };
            const getLayerOrder = (relative: number, index: number) => {
                if (Math.abs(relative) < 0.52) return cards.length * 3 + index;
                if (relative < 0) return cards.length * 2 + index;

                return cards.length - index;
            };
            const getLogicalScrollPosition = (galleryProgress: number) => {
                const start = -2.25;
                const end = finalTailStart - 0.38;

                return start + ((end - start) * galleryProgress) / HANDOFF_TRACK_END;
            };
            const getGalleryTransform = (
                index: number,
                galleryProgress: number,
                focusScaleAccent = 1
            ): TransformState => {
                const relative = index - getLogicalScrollPosition(galleryProgress);
                const base = getCardDepthState(relative, focusScaleAccent);
                const centerX =
                    window.innerWidth * FOCUS_X_RATIO +
                    getPathDistance(relative) +
                    getFocusCorridorOffset(relative);

                return {
                    x: centerX - cardWidth / 2,
                    y: base.y,
                    z: 0,
                    scale: base.scale,
                    rotationY: base.rotationY,
                    zIndex: getLayerOrder(relative, index),
                };
            };
            const getEntryTransform = (
                gallery: TransformState,
                entryProgress: number
            ): TransformState => {
                const remaining = 1 - entryProgress;

                return {
                    x: gallery.x + window.innerWidth * 0.65 * remaining,
                    y: gallery.y,
                    z: 0,
                    scale: gallery.scale * lerp(0.62, 1, entryProgress),
                    rotationY: gallery.rotationY - 8 * remaining,
                    zIndex: gallery.zIndex,
                };
            };
            const getEntryOpacity = (state: TransformState, entryProgress: number) => {
                if (entryProgress === 1) return 1;

                // A narrow right-edge reveal hides only cards that are still outside the scene.
                return clamp((window.innerWidth + 32 - state.x) / 120);
            };
            const getFinalCompositionLayout = (): FinalCompositionLayout => {
                const viewportWidth = window.innerWidth;
                const gutter = Math.max(
                    (viewportWidth - Math.min(viewportWidth - 40, 1280)) / 2,
                    20
                );
                const compositionWidth = Math.max(cardWidth, viewportWidth - gutter * 2);
                const preferredStep = 190;
                const step =
                    finalCount <= 1
                        ? 0
                        : Math.min(
                              preferredStep,
                              (compositionWidth - cardWidth) / (finalCount - 1)
                          );
                const groupWidth = cardWidth + step * Math.max(finalCount - 1, 0);
                const left = gutter + Math.max((compositionWidth - groupWidth) * 0.42, 0);
                const finalCardStepY = 20;
                const maxRise = finalCardStepY * Math.max(finalCount - 1, 0);
                // Center the stepped final stack in the pinned viewport. The title remains
                // an independent backdrop, so it does not pull the card composition upward.
                const finalStackHeight = cardHeight + maxRise;
                const firstCardTop =
                    (window.innerHeight - finalStackHeight) / 2 + FINAL_COMPOSITION_VISUAL_OFFSET;
                const compositionTop = firstCardTop + maxRise;
                const baseY = compositionTop + cardHeight / 2 - window.innerHeight / 2;

                return {
                    left,
                    step,
                    baseY,
                    maxRise,
                    viewAllX: (viewportWidth - viewAll.offsetWidth) / 2,
                    viewAllY: compositionTop + cardHeight + 34,
                };
            };
            const getFinalTransform = (
                index: number,
                count: number,
                layout: FinalCompositionLayout
            ): TransformState => {
                const finalYStep = count <= 1 ? 0 : layout.maxRise / (count - 1);

                return {
                    x: layout.left + index * layout.step,
                    y: layout.baseY - (count - 1 - index) * finalYStep,
                    z: 0,
                    scale: 1,
                    rotationY: 0,
                    zIndex: count - index,
                };
            };
            const render = (progress: number) => {
                const entryProgress = smoothstep(remap(progress, 0, ENTRY_END));
                const finalMorphProgress = smoothstep(
                    remap(progress, FINAL_MORPH_START, FINAL_MORPH_END)
                );
                const flattenProgress = smoothstep(remap(finalMorphProgress, 0, 0.62));
                const staircaseProgress = smoothstep(remap(finalMorphProgress, 0.22, 1));
                const extraExitProgress = smoothstep(
                    remap(progress, FIVE_ROW_START, EXTRA_EXIT_END)
                );
                const viewAllProgress = smoothstep(remap(finalMorphProgress, 0.78, 1));
                const mobileViewAllProgress = smoothstep(remap(progress, 0.02, 0.16));
                const buttonProgress = compact ? mobileViewAllProgress : viewAllProgress;
                const finalLayout = getFinalCompositionLayout();
                const trackProgress = Math.min(
                    mapRange(progress, ENTRY_END, FIVE_ROW_START) * HANDOFF_TRACK_END,
                    HANDOFF_TRACK_END
                );
                const finalTailTrackProgress =
                    progress < FIVE_ROW_START
                        ? trackProgress
                        : HANDOFF_TRACK_END +
                          remap(progress, FIVE_ROW_START, FINAL_MORPH_END) *
                              FINAL_TAIL_TRACK_ADVANCE;
                const isFinalMorph = progress >= FINAL_MORPH_START;

                scene.dataset.phase =
                    progress < ENTRY_END
                        ? "entry"
                        : isFinalMorph
                          ? "final"
                          : progress < FIVE_ROW_START
                            ? "gallery"
                            : "five-row";

                // Final-tail instances keep moving while main cards exit, so the two tracks
                // hand off asynchronously instead of leaving a static waiting phase.
                const galleryStates = cards.map((_, index) => {
                    const cardTrackProgress =
                        index < finalTailStart && progress >= FIVE_ROW_START
                            ? trackProgress + extraExitProgress * 0.32
                            : index < finalTailStart
                              ? trackProgress
                              : finalTailTrackProgress;

                    return getGalleryTransform(
                        index,
                        cardTrackProgress,
                        index >= finalTailStart ? 1 - finalMorphProgress : 1
                    );
                });
                gsap.set(title, {
                    autoAlpha: clamp(entryProgress * 1.5),
                    y: (1 - entryProgress) * 22,
                });
                gsap.set(viewAll, {
                    autoAlpha: buttonProgress,
                    x: finalLayout.viewAllX,
                    y: finalLayout.viewAllY + (1 - buttonProgress) * 8,
                });

                cards.forEach((card, index) => {
                    const gallery = galleryStates[index];
                    const entryScale = 0.78 + entryProgress * 0.22;
                    const entryState = getEntryTransform(gallery, entryProgress);
                    const entryOpacity = getEntryOpacity(entryState, entryProgress);

                    if (index < finalTailStart) {
                        const rightEdge = entryState.x + cardWidth * entryState.scale;
                        const opacity = Math.min(entryOpacity, clamp((rightEdge + 80) / 80));

                        gsap.set(card, {
                            x: entryState.x,
                            y: entryState.y,
                            yPercent: -50,
                            z: entryState.z,
                            scale: entryState.scale * entryScale,
                            rotationY: entryState.rotationY,
                            autoAlpha: opacity,
                            pointerEvents: opacity === 0 ? "none" : "auto",
                            zIndex: entryState.zIndex,
                        });
                        return;
                    }

                    const final = getFinalTransform(
                        index - finalTailStart,
                        finalCount,
                        finalLayout
                    );
                    const flatRow: TransformState = {
                        ...final,
                        y: finalLayout.baseY,
                        zIndex: gallery.zIndex,
                    };
                    // Keep the handoff scale fixed while the tail continues to travel.
                    // Otherwise a card crossing the focal point can grow once more before
                    // the final composition pulls it back to the common size.
                    const handoffScale = getGalleryTransform(index, HANDOFF_TRACK_END).scale;

                    gsap.set(card, {
                        x: lerp(entryState.x, flatRow.x, flattenProgress),
                        y: lerp(
                            lerp(entryState.y, flatRow.y, flattenProgress),
                            final.y,
                            staircaseProgress
                        ),
                        yPercent: -50,
                        z: lerp(entryState.z, flatRow.z, flattenProgress),
                        // Scale is decoupled from the moving depth path during the handoff.
                        // Every final card now converges from its handoff size to one common
                        // final size without a second focal-scale peak.
                        scale:
                            progress < FIVE_ROW_START
                                ? entryState.scale * entryScale
                                : lerp(handoffScale, final.scale, finalMorphProgress),
                        rotationY: lerp(entryState.rotationY, flatRow.rotationY, flattenProgress),
                        // Final-tail cards keep this order from the first morph frame to the
                        // static composition; only positions interpolate during the handoff.
                        zIndex: isFinalMorph ? final.zIndex : gallery.zIndex,
                        autoAlpha: entryOpacity,
                        pointerEvents: entryOpacity === 0 ? "none" : "auto",
                    });
                });
            };

            let fastFinalApproach = false;
            let finalStopConsumed = false;
            const scrollTrigger = ScrollTrigger.create({
                trigger: scene,
                start: "top top",
                end: () => `+=${Math.round(getSceneDistance())}`,
                pin: true,
                pinSpacing: true,
                scrub: true,
                anticipatePin: 1,
                invalidateOnRefresh: true,
                snap: {
                    delay: 0.02,
                    duration: { min: 0.1, max: 0.22 },
                    ease: "power1.out",
                    inertia: false,
                    snapTo: (progress) => {
                        if (!fastFinalApproach || finalStopConsumed) return progress;

                        fastFinalApproach = false;
                        finalStopConsumed = true;
                        return FINAL_HOLD_START;
                    },
                },
                onUpdate: (self) => {
                    const hasReachedFinalPhase = self.progress >= FINAL_MORPH_START;

                    if (!hasReachedFinalPhase || self.direction < 0) {
                        fastFinalApproach = false;
                        if (self.progress < FINAL_MORPH_START) finalStopConsumed = false;
                    } else if (!finalStopConsumed && self.getVelocity() >= FINAL_STOP_VELOCITY) {
                        fastFinalApproach = true;
                    }

                    render(self.progress);
                },
                onRefresh: (self) => render(self.progress),
            });

            render(scrollTrigger.progress);
            return () => {
                scrollTrigger.kill();
                delete scene.dataset.phase;
            };
        },
        { scope: sectionRef, dependencies: [reduced, compact], revertOnUpdate: true }
    );

    // Hover geometry is intentionally suspended while the base depth choreography is tuned.
    const setActiveIndex = (index: number | null) => {
        void index;
    };

    return { sectionRef, sceneRef, titleRef, viewAllRef, setActiveIndex };
}
