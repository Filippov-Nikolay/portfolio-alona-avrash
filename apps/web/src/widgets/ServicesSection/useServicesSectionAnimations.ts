"use client";

import { useRef } from "react";
import type { Service } from "@avrash/content-schema";
import { useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { useGSAP, gsap, ScrollTrigger } from "@/shared/lib/gsap";
import {
    SERVICES_CARD_REVEAL_DISTANCE,
    SERVICES_CARD_REVEAL_DISTANCE_COMPACT,
    SERVICES_CARD_REVEAL_OVERLAP,
    SERVICES_TITLE_REVEAL_DISTANCE,
} from "@/shared/config/scrollChoreography";
import { getTopBandContactOffset } from "@/shared/lib/motion/servicesSceneGeometry";

const FALLBACK_STACK_OFFSET = 20;
const MAX_DESKTOP_REVEAL_DISTANCE = 520;
const DESKTOP_REVEAL_VIEWPORT_RATIO = 0.45;
const SCROLL_SETTLE_THRESHOLD_PX = 0.1;
const MAX_FRAME_DELTA_MS = 34;
const COMPACT_REVEAL_DURATION_MS = 420;
const CARD_INTERACTION_THRESHOLD = 0.5;
const COMPACT_FAST_SCROLL_VELOCITY_PX_PER_MS = 0.9;
const COMPACT_FAST_SCROLL_STEP_PX = 28;
const TRANSITION_PROGRESS_EPSILON = 0.001;

function smoothstep(progress: number) {
    return progress * progress * (3 - 2 * progress);
}

function limitScrollStepThroughReveals(
    from: number,
    to: number,
    revealStarts: number[],
    revealDistance: number,
    maxStep: number
) {
    if (to === from) return to;

    if (to > from) {
        const revealStart = revealStarts.find(
            (start) => from < start + revealDistance && to > start
        );

        if (revealStart === undefined) return to;

        return Math.min(to, Math.max(from, revealStart) + maxStep);
    }

    const revealStart = revealStarts.findLast(
        (start) => from > start && to < start + revealDistance
    );

    if (revealStart === undefined) return to;

    return Math.max(to, Math.min(from, revealStart + revealDistance) - maxStep);
}

export function useServicesSectionAnimations(services: Service[]) {
    useScrollTriggerAutoRefresh([services]);

    const sectionRef = useRef<HTMLElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const gridRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            const media = gsap.matchMedia();

            media.add("(prefers-reduced-motion: no-preference)", () => {
                if (!sectionRef.current) return;
                const title = titleRef.current;
                const grid = gridRef.current;
                if (!title || !grid) return;

                const cards = gsap.utils.toArray<HTMLElement>(":scope > article", grid);
                const softeners = cards.map((card) =>
                    card.querySelector<HTMLElement>("[data-service-softener]")
                );
                const stabilizeViewportHeight = window.matchMedia(
                    "(hover: none) and (pointer: coarse)"
                ).matches;
                let sceneViewportWidth = window.innerWidth;
                let sceneViewportHeight = window.innerHeight;

                const getSceneViewportHeight = () => {
                    const nextWidth = window.innerWidth;

                    if (!stabilizeViewportHeight || Math.abs(nextWidth - sceneViewportWidth) > 1) {
                        sceneViewportWidth = nextWidth;
                        sceneViewportHeight = window.innerHeight;
                    }

                    return sceneViewportHeight;
                };

                const getContactOffset = () => {
                    const headerHeight =
                        document.querySelector("header")?.getBoundingClientRect().height ?? 96;

                    return getTopBandContactOffset(getSceneViewportHeight(), headerHeight);
                };

                const titleStart = () => `top top+=${getContactOffset()}`;
                const getCardRevealDistance = () => {
                    if (window.matchMedia("(max-width: 767px)").matches) {
                        return SERVICES_CARD_REVEAL_DISTANCE_COMPACT;
                    }

                    return Math.min(
                        MAX_DESKTOP_REVEAL_DISTANCE,
                        Math.max(
                            SERVICES_CARD_REVEAL_DISTANCE,
                            getSceneViewportHeight() * DESKTOP_REVEAL_VIEWPORT_RATIO
                        )
                    );
                };

                gsap.set(title, {
                    autoAlpha: 0,
                    y: 44,
                    clipPath: "inset(100% 0 0)",
                });

                gsap.to(title, {
                    autoAlpha: 1,
                    y: 0,
                    clipPath: "inset(0% 0 0)",
                    ease: "none",
                    force3D: true,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: titleStart,
                        end: `+=${SERVICES_TITLE_REVEAL_DISTANCE}`,
                        scrub: 0.45,
                    },
                });

                if (cards.length === 0) return;

                gsap.set(cards, {
                    opacity: 0,
                    y: 0,
                    scale: 1,
                    transformOrigin: "center top",
                });

                const renderedCardStates = cards.map(() => ({
                    opacity: Number.POSITIVE_INFINITY,
                    scale: Number.POSITIVE_INFINITY,
                    y: Number.POSITIVE_INFINITY,
                }));
                const renderedSoftness = cards.map(() => Number.POSITIVE_INFINITY);
                const inertStates = cards.map(() => false);
                const layerActiveStates = cards.map(() => false);
                const softenerVisibleStates = cards.map(() => false);
                const cardVisibleStates = cards.map<boolean | null>(() => null);
                let revealDistance = 0;
                let stackOffset = 0;
                let revealStarts: number[] = [];
                let renderedScroll = window.scrollY;
                let targetScroll = renderedScroll;
                let followFrame = 0;
                let previousFrameTime = 0;
                let capRevealSpeed = false;
                let sceneScrollStart = 0;
                let sceneScrollEnd = 0;
                let lastObservedScroll = window.scrollY;
                let lastObservedTime = performance.now();

                const measureCards = () => {
                    const scrollY = window.scrollY;
                    const gridRect = grid.getBoundingClientRect();
                    revealDistance = getCardRevealDistance();
                    capRevealSpeed = window.matchMedia("(max-width: 767px)").matches;
                    sceneScrollStart = gridRect.top + scrollY - getSceneViewportHeight();
                    sceneScrollEnd = gridRect.bottom + scrollY;
                    stackOffset =
                        Number.parseFloat(
                            getComputedStyle(grid).getPropertyValue("--_stack-offset")
                        ) || FALLBACK_STACK_OFFSET;
                    const firstCardContact = getContactOffset() - SERVICES_CARD_REVEAL_OVERLAP;
                    revealStarts = cards.map((card, index) => {
                        const runway = card.previousElementSibling;
                        const flowTop = runway
                            ? runway.getBoundingClientRect().bottom + scrollY
                            : gridRect.top + scrollY;
                        const stickyTop = Number.parseFloat(getComputedStyle(card).top);

                        if (index === 0) return flowTop - firstCardContact;

                        return flowTop - stickyTop - revealDistance;
                    });
                };

                const renderCards = (scrollY: number) => {
                    const progresses = revealStarts.map((start) => {
                        const progress = gsap.utils.clamp(0, 1, (scrollY - start) / revealDistance);
                        return smoothstep(progress);
                    });

                    cards.forEach((card, index) => {
                        const entry = progresses[index];
                        const promotion = progresses[index + 1] ?? 0;
                        const exit = progresses[index + 2] ?? 0;
                        const slotOffset = index === 0 ? 0 : stackOffset * (1 - promotion);
                        const opacity = entry * (1 - exit);
                        const softness = gsap.utils.clamp(0, 1, 1 - entry + (exit * 4) / 6);
                        const y =
                            (1 - entry) * (index === 0 ? 30 : stackOffset * 4) +
                            slotOffset -
                            exit * stackOffset;
                        const scale = 1 - (1 - entry) * 0.015 - (promotion + exit) * 0.02;
                        const softener = softeners[index];
                        const showSoftener = opacity > 0.001 && softness > 0.01;
                        const layerLead = Math.min(revealDistance * 0.35, 120);
                        const isNearReveal =
                            scrollY >= revealStarts[index] - layerLead &&
                            scrollY <= revealStarts[index] + revealDistance;
                        const isTransitioning = [entry, promotion, exit].some(
                            (progress) =>
                                progress > TRANSITION_PROGRESS_EPSILON &&
                                progress < 1 - TRANSITION_PROGRESS_EPSILON
                        );
                        const activateLayer = isTransitioning || isNearReveal;
                        const isVisible = opacity > TRANSITION_PROGRESS_EPSILON;

                        if (cardVisibleStates[index] !== isVisible) {
                            cardVisibleStates[index] = isVisible;
                            card.style.visibility = isVisible ? "visible" : "hidden";
                        }

                        const renderedState = renderedCardStates[index];
                        if (
                            Math.abs(renderedState.opacity - opacity) > 0.0001 ||
                            Math.abs(renderedState.y - y) > 0.01 ||
                            Math.abs(renderedState.scale - scale) > 0.00001
                        ) {
                            renderedState.opacity = opacity;
                            renderedState.y = y;
                            renderedState.scale = scale;
                            card.style.opacity = opacity.toFixed(4);
                            card.style.transform = `translateY(${y.toFixed(3)}px) scale(${scale.toFixed(5)})`;
                        }
                        if (layerActiveStates[index] !== activateLayer) {
                            layerActiveStates[index] = activateLayer;
                            if (activateLayer) card.style.willChange = "transform, opacity";
                            else card.style.removeProperty("will-change");
                        }
                        if (softener && softenerVisibleStates[index] !== showSoftener) {
                            softenerVisibleStates[index] = showSoftener;
                            if (showSoftener) softener.style.willChange = "opacity";
                            else softener.style.removeProperty("will-change");
                            softener.hidden = !showSoftener;
                        }
                        const nextSoftness = showSoftener ? softness : 0;
                        if (softener && Math.abs(renderedSoftness[index] - nextSoftness) > 0.0001) {
                            renderedSoftness[index] = nextSoftness;
                            softener.style.opacity = nextSoftness.toFixed(4);
                        }
                        const nextInert =
                            opacity < CARD_INTERACTION_THRESHOLD ||
                            promotion >= CARD_INTERACTION_THRESHOLD;
                        if (inertStates[index] !== nextInert) {
                            inertStates[index] = nextInert;
                            card.inert = nextInert;
                            card.style.pointerEvents = nextInert ? "none" : "auto";
                        }
                    });
                };

                const clearLayerHints = () => {
                    cards.forEach((card, index) => {
                        layerActiveStates[index] = false;
                        card.style.removeProperty("will-change");
                    });
                    softeners.forEach((softener) => {
                        softener?.style.removeProperty("will-change");
                    });
                };

                const stopFollowingScroll = () => {
                    if (!followFrame) return;
                    cancelAnimationFrame(followFrame);
                    followFrame = 0;
                    previousFrameTime = 0;
                };

                const followScroll = (time: number) => {
                    targetScroll = window.scrollY;
                    const elapsed = Math.min(
                        previousFrameTime ? time - previousFrameTime : 16.67,
                        MAX_FRAME_DELTA_MS
                    );
                    previousFrameTime = time;
                    const distance = targetScroll - renderedScroll;

                    if (Math.abs(distance) <= SCROLL_SETTLE_THRESHOLD_PX) {
                        renderedScroll = targetScroll;
                        renderCards(renderedScroll);
                        followFrame = 0;
                        previousFrameTime = 0;
                        return;
                    }

                    renderedScroll = limitScrollStepThroughReveals(
                        renderedScroll,
                        targetScroll,
                        revealStarts,
                        revealDistance,
                        (revealDistance * elapsed) / COMPACT_REVEAL_DURATION_MS
                    );
                    renderCards(renderedScroll);
                    followFrame = requestAnimationFrame(followScroll);
                };

                const renderTowards = (scrollY: number) => {
                    const now = performance.now();
                    let inputVelocity = 0;
                    const inputDistance = Math.abs(scrollY - lastObservedScroll);
                    const inputChanged = inputDistance > SCROLL_SETTLE_THRESHOLD_PX;

                    if (inputChanged) {
                        const elapsed = Math.max(now - lastObservedTime, 1);
                        inputVelocity = inputDistance / elapsed;
                        lastObservedScroll = scrollY;
                        lastObservedTime = now;
                    }

                    if (
                        !followFrame &&
                        Math.abs(scrollY - renderedScroll) <= SCROLL_SETTLE_THRESHOLD_PX
                    ) {
                        return;
                    }

                    if (!capRevealSpeed) {
                        renderImmediately(scrollY);
                        return;
                    }

                    targetScroll = scrollY;
                    const isFastScroll =
                        inputVelocity >= COMPACT_FAST_SCROLL_VELOCITY_PX_PER_MS ||
                        inputDistance >= COMPACT_FAST_SCROLL_STEP_PX;

                    if (followFrame) {
                        if (inputChanged && !isFastScroll) {
                            renderImmediately(targetScroll);
                        }
                        return;
                    }

                    const directScroll = limitScrollStepThroughReveals(
                        renderedScroll,
                        targetScroll,
                        revealStarts,
                        revealDistance,
                        (revealDistance * 16.67) / COMPACT_REVEAL_DURATION_MS
                    );

                    const crossesReveal =
                        Math.abs(directScroll - targetScroll) > SCROLL_SETTLE_THRESHOLD_PX;

                    if (!crossesReveal || !isFastScroll) {
                        renderImmediately(targetScroll);
                        return;
                    }

                    followFrame = requestAnimationFrame(followScroll);
                };

                const renderImmediately = (scrollY: number) => {
                    stopFollowingScroll();
                    renderedScroll = scrollY;
                    targetScroll = scrollY;
                    lastObservedScroll = scrollY;
                    lastObservedTime = performance.now();
                    renderCards(scrollY);
                };

                let sceneActive = false;
                const handleNativeScroll = () => {
                    const scrollY = window.scrollY;
                    const isInsideMeasuredScene =
                        scrollY >= sceneScrollStart && scrollY <= sceneScrollEnd;
                    if (sceneActive || isInsideMeasuredScene || followFrame) {
                        renderTowards(scrollY);
                    }
                };

                measureCards();

                const cardTrigger = ScrollTrigger.create({
                    trigger: grid,
                    start: "top bottom",
                    end: "bottom top",
                    onRefresh: (self) => {
                        measureCards();
                        renderImmediately(self.scroll());
                    },
                    onUpdate: (self) => renderTowards(self.scroll()),
                    onToggle: (self) => {
                        sceneActive = self.isActive;
                        if (sceneActive) return;

                        renderImmediately(self.scroll());
                        clearLayerHints();
                    },
                });

                window.addEventListener("scroll", handleNativeScroll, { passive: true });
                renderImmediately(cardTrigger.scroll());

                return () => {
                    stopFollowingScroll();
                    window.removeEventListener("scroll", handleNativeScroll);
                    cardTrigger.kill();
                    cards.forEach((card) => {
                        card.inert = false;
                        card.style.removeProperty("opacity");
                        card.style.removeProperty("pointer-events");
                        card.style.removeProperty("transform");
                        card.style.removeProperty("visibility");
                    });
                    softeners.forEach((softener) => {
                        if (softener) softener.hidden = true;
                    });
                    clearLayerHints();
                    softeners.forEach((softener) => {
                        softener?.style.removeProperty("opacity");
                    });
                };
            });

            return () => media.revert();
        },
        { scope: sectionRef, dependencies: [services], revertOnUpdate: true }
    );

    return { sectionRef, titleRef, gridRef };
}
