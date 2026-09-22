"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { createViewportResizeGuard } from "@/shared/lib/motion";

const ENTRY_START_RATIO = 1;
const SETTLE_RATIO = 0.5;
const ACTIVE_ROOT_MARGIN = "0px 0px 12% 0px";
const PROGRESS_EPSILON = 0.001;
const REVEAL_RISE_PX = 24;
const REVEAL_MIN_SCALE = 0.9;
const REVEAL_HOVER_SCALE = 1.015;
const REVEAL_MAX_BLUR_PX = 9;

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

function smoothstep(t: number) {
    return t * t * (3 - 2 * t);
}

function resetCardStyle(card: HTMLElement) {
    card.style.removeProperty("--reveal");
    card.style.removeProperty("--reveal-y");
    card.style.removeProperty("--reveal-scale");
    card.style.removeProperty("--reveal-hover-scale");
    card.style.removeProperty("--reveal-blur");
    card.style.filter = "";
    card.style.willChange = "";
    card.removeAttribute("data-works-reveal-active");
}

export function useWorksCardReveal() {
    const cardsRef = useRef<Map<number, HTMLElement>>(new Map());
    const registerCallbacksRef = useRef<Map<number, (el: HTMLElement | null) => void>>(new Map());
    const observerRef = useRef<IntersectionObserver | null>(null);
    const activeCardsRef = useRef<Set<HTMLElement>>(new Set());
    const progressRef = useRef<Map<HTMLElement, number>>(new Map());
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (reducedMotion) return;

        const cardsMap = cardsRef.current;
        const activeCards = activeCardsRef.current;
        const progressByCard = progressRef.current;
        let frame = 0;
        let viewportHeight = window.innerHeight;
        const shouldMeasureViewportResize = createViewportResizeGuard();

        const applyProgress = (card: HTMLElement, progress: number) => {
            const previousProgress = progressByCard.get(card);
            if (
                previousProgress !== undefined &&
                Math.abs(previousProgress - progress) < PROGRESS_EPSILON
            ) {
                return;
            }

            progressByCard.set(card, progress);
            const revealScale = REVEAL_MIN_SCALE + progress * (1 - REVEAL_MIN_SCALE);
            card.style.setProperty("--reveal", progress.toFixed(3));
            card.style.setProperty(
                "--reveal-y",
                `${((1 - progress) * REVEAL_RISE_PX).toFixed(2)}px`
            );
            card.style.setProperty("--reveal-scale", revealScale.toFixed(4));
            card.style.setProperty(
                "--reveal-hover-scale",
                (revealScale * REVEAL_HOVER_SCALE).toFixed(4)
            );
            card.style.setProperty(
                "--reveal-blur",
                `${((1 - progress) * REVEAL_MAX_BLUR_PX).toFixed(2)}px`
            );

            const isAnimating = progress > PROGRESS_EPSILON && progress < 1 - PROGRESS_EPSILON;
            const wasAnimating = card.hasAttribute("data-works-reveal-active");
            if (isAnimating === wasAnimating) return;

            card.toggleAttribute("data-works-reveal-active", isAnimating);
            card.style.willChange = isAnimating ? "filter, transform" : "auto";
        };

        const update = () => {
            frame = 0;
            const entryStart = viewportHeight * ENTRY_START_RATIO;
            const settle = viewportHeight * SETTLE_RATIO;
            const revealDistance = Math.max(entryStart - settle, 1);
            const measurements = Array.from(activeCards, (card) => ({
                card,
                top: card.getBoundingClientRect().top,
            }));

            for (const { card, top } of measurements) {
                const progress = smoothstep(clamp01((entryStart - top) / revealDistance));
                applyProgress(card, progress);
            }
        };

        const scheduleUpdate = () => {
            if (frame || activeCards.size === 0) return;
            frame = requestAnimationFrame(update);
        };

        const observer = new IntersectionObserver(
            (entries) => {
                const settle = viewportHeight * SETTLE_RATIO;

                for (const entry of entries) {
                    const card = entry.target as HTMLElement;
                    if (entry.isIntersecting) {
                        activeCards.add(card);
                        continue;
                    }

                    activeCards.delete(card);
                    applyProgress(card, entry.boundingClientRect.top <= settle ? 1 : 0);
                }

                scheduleUpdate();
            },
            { rootMargin: ACTIVE_ROOT_MARGIN }
        );

        observerRef.current = observer;
        for (const card of cardsMap.values()) observer.observe(card);

        const handleResize = () => {
            if (!shouldMeasureViewportResize()) return;

            viewportHeight = window.innerHeight;
            scheduleUpdate();
        };

        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", handleResize);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", scheduleUpdate);
            window.removeEventListener("resize", handleResize);
            observer.disconnect();
            observerRef.current = null;
            activeCards.clear();
            progressByCard.clear();
            for (const card of cardsMap.values()) {
                resetCardStyle(card);
            }
        };
    }, [reducedMotion]);

    return useCallback((id: number) => {
        let callback = registerCallbacksRef.current.get(id);
        if (!callback) {
            callback = (el: HTMLElement | null) => {
                if (el) {
                    const previous = cardsRef.current.get(id);
                    if (previous && previous !== el) {
                        observerRef.current?.unobserve(previous);
                        activeCardsRef.current.delete(previous);
                        progressRef.current.delete(previous);
                        resetCardStyle(previous);
                    }

                    cardsRef.current.set(id, el);
                    observerRef.current?.observe(el);
                    return;
                }

                const previous = cardsRef.current.get(id);
                if (previous) {
                    observerRef.current?.unobserve(previous);
                    activeCardsRef.current.delete(previous);
                    progressRef.current.delete(previous);
                    resetCardStyle(previous);
                }
                cardsRef.current.delete(id);
            };
            registerCallbacksRef.current.set(id, callback);
        }
        return callback;
    }, []);
}
