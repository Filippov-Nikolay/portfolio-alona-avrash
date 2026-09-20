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
const SCROLL_FOLLOW_TIME_MS = 150;
const SCROLL_SETTLE_THRESHOLD_PX = 0.1;

function smoothstep(progress: number) {
    return progress * progress * (3 - 2 * progress);
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

                const getContactOffset = () => {
                    const headerHeight =
                        document.querySelector("header")?.getBoundingClientRect().height ?? 96;

                    return getTopBandContactOffset(window.innerHeight, headerHeight);
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
                            window.innerHeight * DESKTOP_REVEAL_VIEWPORT_RATIO
                        )
                    );
                };

                gsap.set(title, {
                    autoAlpha: 0,
                    y: 44,
                    filter: "blur(5px)",
                    clipPath: "inset(100% 0 0)",
                });

                gsap.to(title, {
                    autoAlpha: 1,
                    y: 0,
                    filter: "blur(0px)",
                    clipPath: "inset(0% 0 0)",
                    ease: "none",
                    force3D: true,
                    scrollTrigger: {
                        trigger: sectionRef.current,
                        start: titleStart,
                        end: `+=${SERVICES_TITLE_REVEAL_DISTANCE}`,
                        scrub: 0.45,
                        invalidateOnRefresh: true,
                    },
                });

                if (cards.length === 0) return;

                gsap.set(cards, {
                    autoAlpha: 0,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)",
                    transformOrigin: "center top",
                });

                const setters = cards.map((card) => gsap.quickSetter(card, "css"));
                let revealDistance = 0;
                let stackOffset = 0;
                let revealStarts: number[] = [];
                let renderedScroll = window.scrollY;
                let targetScroll = renderedScroll;
                let followFrame = 0;
                let previousFrameTime = 0;

                const measureCards = () => {
                    const scrollY = window.scrollY;
                    revealDistance = getCardRevealDistance();
                    stackOffset =
                        Number.parseFloat(
                            getComputedStyle(grid).getPropertyValue("--_stack-offset")
                        ) || FALLBACK_STACK_OFFSET;
                    const firstCardContact = getContactOffset() - SERVICES_CARD_REVEAL_OVERLAP;
                    revealStarts = cards.map((card, index) => {
                        const runway = card.previousElementSibling;
                        const flowTop = runway
                            ? runway.getBoundingClientRect().bottom + scrollY
                            : grid.getBoundingClientRect().top + scrollY;
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

                        setters[index]({
                            autoAlpha: entry * (1 - exit),
                            y:
                                (1 - entry) * (index === 0 ? 30 : stackOffset * 4) +
                                slotOffset -
                                exit * stackOffset,
                            scale: 1 - (1 - entry) * 0.015 - (promotion + exit) * 0.02,
                            filter: `blur(${(1 - entry) * 6 + exit * 4}px)`,
                        });
                        card.inert = entry < 1 || promotion > 0;
                    });
                };

                const stopFollowingScroll = () => {
                    if (!followFrame) return;
                    cancelAnimationFrame(followFrame);
                    followFrame = 0;
                    previousFrameTime = 0;
                };

                const followScroll = (time: number) => {
                    const elapsed = previousFrameTime ? time - previousFrameTime : 16.67;
                    previousFrameTime = time;
                    const distance = targetScroll - renderedScroll;
                    const followAmount = 1 - Math.exp(-elapsed / SCROLL_FOLLOW_TIME_MS);

                    if (Math.abs(distance) <= SCROLL_SETTLE_THRESHOLD_PX) {
                        renderedScroll = targetScroll;
                        renderCards(renderedScroll);
                        followFrame = 0;
                        previousFrameTime = 0;
                        return;
                    }

                    renderedScroll += distance * followAmount;
                    renderCards(renderedScroll);
                    followFrame = requestAnimationFrame(followScroll);
                };

                const renderTowards = (scrollY: number) => {
                    targetScroll = scrollY;
                    if (!followFrame) followFrame = requestAnimationFrame(followScroll);
                };

                const renderImmediately = (scrollY: number) => {
                    stopFollowingScroll();
                    renderedScroll = scrollY;
                    targetScroll = scrollY;
                    renderCards(scrollY);
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
                });

                renderImmediately(cardTrigger.scroll());

                return () => {
                    stopFollowingScroll();
                    cardTrigger.kill();
                    cards.forEach((card) => {
                        card.inert = false;
                    });
                };
            });

            return () => media.revert();
        },
        { scope: sectionRef, dependencies: [services], revertOnUpdate: true }
    );

    return { sectionRef, titleRef, gridRef };
}
