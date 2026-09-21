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
const COMPACT_MEDIA_QUERY = "(max-width: 479px)";
const PATH_SAMPLES_PER_CARD = 64;

const clamp = (value: number, min = 0, max = 1) => Math.min(Math.max(value, min), max);
const lerp = (from: number, to: number, progress: number) => from + (to - from) * progress;
const remap = (value: number, start: number, end: number) => clamp((value - start) / (end - start));
const mapRange = (value: number, start: number, end: number) => (value - start) / (end - start);
const smoothstep = (value: number) => {
    const clamped = clamp(value);
    return clamped * clamped * (3 - 2 * clamped);
};

function useCompactViewport() {
    const [compact, setCompact] = useState(
        () => typeof window !== "undefined" && window.matchMedia(COMPACT_MEDIA_QUERY).matches
    );

    useEffect(() => {
        const media = window.matchMedia(COMPACT_MEDIA_QUERY);
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
    const viewAllRef = useRef<HTMLDivElement>(null);

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
            let viewportWidth = window.innerWidth;
            let viewportHeight = window.innerHeight;

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
            const maxPathRelative = cards.length + 4;
            const pathStep = 1 / PATH_SAMPLES_PER_CARD;
            const pathDistances = new Float64Array(
                Math.ceil(maxPathRelative * PATH_SAMPLES_PER_CARD) + 1
            );

            for (let index = 1; index < pathDistances.length; index += 1) {
                const midpoint = (index - 0.5) * pathStep;
                pathDistances[index] =
                    pathDistances[index - 1] + getSpacingDensity(midpoint) * pathStep;
            }

            const getPathDistance = (relative: number) => {
                if (relative <= 0) return relative * passedCardStep;

                const tablePosition = Math.min(relative, maxPathRelative) / pathStep;
                const lowerIndex = Math.floor(tablePosition);
                const upperIndex = Math.min(lowerIndex + 1, pathDistances.length - 1);
                const distance = lerp(
                    pathDistances[lowerIndex],
                    pathDistances[upperIndex],
                    tablePosition - lowerIndex
                );

                if (relative <= maxPathRelative) return distance;

                return distance + (relative - maxPathRelative) * getSpacingDensity(maxPathRelative);
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
                    viewportWidth * FOCUS_X_RATIO +
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
                    x: gallery.x + viewportWidth * 0.65 * remaining,
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
                return clamp((viewportWidth + 32 - state.x) / 120);
            };
            const getFinalCompositionLayout = (): FinalCompositionLayout => {
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
                    (viewportHeight - finalStackHeight) / 2 + FINAL_COMPOSITION_VISUAL_OFFSET;
                const compositionTop = firstCardTop + maxRise;
                const baseY = compositionTop + cardHeight / 2 - viewportHeight / 2;

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
            const handoffLogicalPosition = getLogicalScrollPosition(HANDOFF_TRACK_END);
            const handoffScales = cards.map(
                (_, index) => getCardDepthState(index - handoffLogicalPosition).scale
            );
            let finalLayout = getFinalCompositionLayout();
            let finalTransforms = Array.from({ length: finalCount }, (_, index) =>
                getFinalTransform(index, finalCount, finalLayout)
            );

            const measureScene = () => {
                viewportWidth = window.innerWidth;
                viewportHeight = window.innerHeight;
                finalLayout = getFinalCompositionLayout();
                finalTransforms = Array.from({ length: finalCount }, (_, index) =>
                    getFinalTransform(index, finalCount, finalLayout)
                );
            };

            gsap.set(cards, { yPercent: -50, force3D: true });
            const cardSetters = cards.map((card) => gsap.quickSetter(card, "css"));
            const titleSetter = gsap.quickSetter(title, "css");
            const viewAllSetter = gsap.quickSetter(viewAll, "css");
            const zIndexSetters = cards.map((card) => gsap.quickSetter(card, "zIndex"));
            const visibilitySetters = cards.map((card) => gsap.quickSetter(card, "visibility"));
            const pointerEventSetters = cards.map((card) =>
                gsap.quickSetter(card, "pointerEvents")
            );
            const renderedZIndices = new Array<number>(cards.length).fill(Number.NaN);
            const renderedVisibility = new Array<boolean | null>(cards.length).fill(null);
            let renderedTitleOpacity = Number.NaN;
            let renderedTitleY = Number.NaN;
            let renderedButtonOpacity = Number.NaN;
            let renderedButtonX = Number.NaN;
            let renderedButtonY = Number.NaN;
            let renderedPhase = "";

            const setCardState = (
                index: number,
                x: number,
                y: number,
                scale: number,
                rotationY: number,
                opacity: number,
                zIndex: number
            ) => {
                const isVisible = opacity !== 0;
                if (!isVisible && renderedVisibility[index] === false) return;

                cardSetters[index]({
                    x,
                    y,
                    scale,
                    rotationY,
                    opacity,
                });

                if (renderedZIndices[index] !== zIndex) {
                    renderedZIndices[index] = zIndex;
                    zIndexSetters[index](zIndex);
                }

                if (renderedVisibility[index] !== isVisible) {
                    renderedVisibility[index] = isVisible;
                    visibilitySetters[index](isVisible ? "inherit" : "hidden");
                    pointerEventSetters[index](isVisible ? "auto" : "none");
                }
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

                const phase =
                    progress < ENTRY_END
                        ? "entry"
                        : isFinalMorph
                          ? "final"
                          : progress < FIVE_ROW_START
                            ? "gallery"
                            : "five-row";

                if (renderedPhase !== phase) {
                    renderedPhase = phase;
                    scene.dataset.phase = phase;
                }

                const titleOpacity = clamp(entryProgress * 1.5);
                const titleY = (1 - entryProgress) * 22;
                if (titleOpacity !== renderedTitleOpacity || titleY !== renderedTitleY) {
                    renderedTitleOpacity = titleOpacity;
                    renderedTitleY = titleY;
                    titleSetter({ autoAlpha: titleOpacity, y: titleY });
                }

                const buttonX = finalLayout.viewAllX;
                const buttonY = finalLayout.viewAllY + (1 - buttonProgress) * 8;
                if (
                    buttonProgress !== renderedButtonOpacity ||
                    buttonX !== renderedButtonX ||
                    buttonY !== renderedButtonY
                ) {
                    renderedButtonOpacity = buttonProgress;
                    renderedButtonX = buttonX;
                    renderedButtonY = buttonY;
                    viewAllSetter({ autoAlpha: buttonProgress, x: buttonX, y: buttonY });
                }

                cards.forEach((_, index) => {
                    // Final-tail instances keep moving while main cards exit, so the two
                    // tracks hand off asynchronously instead of leaving a waiting phase.
                    const cardTrackProgress =
                        index < finalTailStart && progress >= FIVE_ROW_START
                            ? trackProgress + extraExitProgress * 0.32
                            : index < finalTailStart
                              ? trackProgress
                              : finalTailTrackProgress;
                    const gallery = getGalleryTransform(
                        index,
                        cardTrackProgress,
                        index >= finalTailStart ? 1 - finalMorphProgress : 1
                    );
                    const entryScale = 0.78 + entryProgress * 0.22;
                    const entryState = getEntryTransform(gallery, entryProgress);
                    const entryOpacity = getEntryOpacity(entryState, entryProgress);

                    if (index < finalTailStart) {
                        const rightEdge = entryState.x + cardWidth * entryState.scale;
                        const opacity = Math.min(entryOpacity, clamp((rightEdge + 80) / 80));

                        setCardState(
                            index,
                            entryState.x,
                            entryState.y,
                            entryState.scale * entryScale,
                            entryState.rotationY,
                            opacity,
                            entryState.zIndex
                        );
                        return;
                    }

                    const final = finalTransforms[index - finalTailStart];
                    setCardState(
                        index,
                        lerp(entryState.x, final.x, flattenProgress),
                        lerp(
                            lerp(entryState.y, finalLayout.baseY, flattenProgress),
                            final.y,
                            staircaseProgress
                        ),
                        // Scale is decoupled from the moving depth path during the handoff.
                        // Every final card now converges from its handoff size to one common
                        // final size without a second focal-scale peak.
                        progress < FIVE_ROW_START
                            ? entryState.scale * entryScale
                            : lerp(handoffScales[index], final.scale, finalMorphProgress),
                        lerp(entryState.rotationY, final.rotationY, flattenProgress),
                        entryOpacity,
                        // Final-tail cards keep this order from the first morph frame to the
                        // static composition; only positions interpolate during the handoff.
                        isFinalMorph ? final.zIndex : gallery.zIndex
                    );
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
                refreshPriority: 1,
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
                onRefreshInit: measureScene,
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
