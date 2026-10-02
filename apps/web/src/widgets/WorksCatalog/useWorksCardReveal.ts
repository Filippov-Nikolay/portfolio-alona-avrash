"use client";

import { useCallback, useLayoutEffect, useRef } from "react";
import { cancelFrame, frame } from "framer-motion";
import { createViewportResizeGuard } from "@/shared/lib/motion/mobileViewport";

const ENTRY_START_RATIO = 1;
const SETTLE_RATIO = 0.5;
const PROGRESS_EPSILON = 0.001;

type Card = { element: HTMLElement; top: number; progress: number | undefined };
type Controller = {
    invalidate: () => void;
    observe: (element: HTMLElement) => void;
    unobserve: (element: HTMLElement) => void;
};

function resetCard(card: Card) {
    card.progress = undefined;
    card.element.style.removeProperty("--reveal");
    card.element.style.removeProperty("will-change");
    card.element.removeAttribute("data-works-reveal-active");
    card.element.removeAttribute("data-works-reveal-settled");
}

export function useWorksCardReveal(layoutKey: unknown) {
    const cardsRef = useRef(new Map<number, Card>());
    const callbacksRef = useRef(new Map<number, (element: HTMLDivElement | null) => void>());
    const controllerRef = useRef<Controller | null>(null);

    useLayoutEffect(() => {
        const cards = cardsRef.current;
        const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
        const shouldMeasureResize = createViewportResizeGuard();
        const pending = new Map<Card, number>();
        let viewportHeight = window.innerHeight;
        let needsMeasure = true;
        let disposed = false;

        const render = () => {
            for (const [card, progress] of pending) {
                const previous = card.progress;
                if (previous !== undefined && Math.abs(previous - progress) < PROGRESS_EPSILON)
                    continue;

                const isActive = progress > PROGRESS_EPSILON && progress < 1 - PROGRESS_EPSILON;
                const wasActive =
                    previous !== undefined &&
                    previous > PROGRESS_EPSILON &&
                    previous < 1 - PROGRESS_EPSILON;
                const isSettled = progress >= 1 - PROGRESS_EPSILON;
                const wasSettled = previous !== undefined && previous >= 1 - PROGRESS_EPSILON;

                card.progress = progress;
                // CSS derives the original rise, scale and blur from one value.
                card.element.style.setProperty("--reveal", progress.toFixed(3));
                if (isSettled !== wasSettled)
                    card.element.toggleAttribute("data-works-reveal-settled", isSettled);
                if (isActive !== wasActive) {
                    card.element.toggleAttribute("data-works-reveal-active", isActive);
                    card.element.style.willChange = isActive ? "filter, transform" : "auto";
                }
            }
            pending.clear();
        };

        const read = () => {
            if (disposed || motionQuery.matches) return;

            if (needsMeasure) {
                // offsetTop ignores both the card's reveal transform and its
                // parent's entrance animation. Re-reading transformed bounds
                // used to feed the animation back into its own progress.
                const offsets = new Map<HTMLElement, number>();
                const layoutTop = (element: HTMLElement): number => {
                    const cached = offsets.get(element);
                    if (cached !== undefined) return cached;
                    const parent = element.offsetParent as HTMLElement | null;
                    const top =
                        element.offsetTop + (parent ? layoutTop(parent) + parent.clientTop : 0);
                    offsets.set(element, top);
                    return top;
                };
                for (const card of cards.values()) card.top = layoutTop(card.element);
                needsMeasure = false;
            }

            const scrollY = window.scrollY;
            const entryStart = viewportHeight * ENTRY_START_RATIO;
            const distance = Math.max(entryStart - viewportHeight * SETTLE_RATIO, 1);
            // Only arithmetic during scrolling. Offscreen/settled cards keep
            // their styles and allocate no new layers or DOM measurements.
            for (const card of cards.values()) {
                const t = Math.max(0, Math.min(1, (entryStart - (card.top - scrollY)) / distance));
                const progress = t * t * (3 - 2 * t);
                if (
                    card.progress === undefined ||
                    Math.abs(card.progress - progress) >= PROGRESS_EPSILON
                )
                    pending.set(card, progress);
            }
            if (pending.size > 0) frame.render(render);
        };
        const schedule = () => {
            if (!disposed && !motionQuery.matches) frame.read(read);
        };
        const invalidate = () => {
            needsMeasure = true;
            schedule();
        };
        const resize = () => {
            if (!shouldMeasureResize()) return;
            viewportHeight = window.innerHeight;
            invalidate();
        };
        const changeMotion = () => {
            cancelFrame(read);
            cancelFrame(render);
            pending.clear();
            for (const card of cards.values()) resetCard(card);
            invalidate();
        };
        const observer = new ResizeObserver(invalidate);
        const controller: Controller = {
            invalidate,
            observe: (element) => {
                observer.observe(element);
                invalidate();
            },
            unobserve: (element) => {
                observer.unobserve(element);
                for (const card of pending.keys()) {
                    if (card.element === element) pending.delete(card);
                }
                invalidate();
            },
        };
        controllerRef.current = controller;
        // Also catch content above the cards moving them (fonts, header, CTA).
        observer.observe(document.body);
        for (const card of cards.values()) observer.observe(card.element);
        void document.fonts.ready.then(() => {
            if (!disposed) invalidate();
        });
        window.addEventListener("scroll", schedule, { passive: true });
        window.addEventListener("resize", resize);
        window.addEventListener("pageshow", invalidate);
        motionQuery.addEventListener("change", changeMotion);
        schedule();

        return () => {
            disposed = true;
            cancelFrame(read);
            cancelFrame(render);
            pending.clear();
            observer.disconnect();
            window.removeEventListener("scroll", schedule);
            window.removeEventListener("resize", resize);
            window.removeEventListener("pageshow", invalidate);
            motionQuery.removeEventListener("change", changeMotion);
            controllerRef.current = null;
            for (const card of cards.values()) resetCard(card);
        };
    }, []);

    // Sorting can move existing nodes without changing any element's size.
    useLayoutEffect(() => controllerRef.current?.invalidate(), [layoutKey]);

    return useCallback((id: number) => {
        let callback = callbacksRef.current.get(id);
        if (!callback) {
            callback = (element) => {
                const previous = cardsRef.current.get(id);
                if (previous?.element === element) return;
                if (previous) {
                    controllerRef.current?.unobserve(previous.element);
                    resetCard(previous);
                    cardsRef.current.delete(id);
                }
                if (element) {
                    cardsRef.current.set(id, { element, top: 0, progress: undefined });
                    controllerRef.current?.observe(element);
                }
            };
            callbacksRef.current.set(id, callback);
        }
        return callback;
    }, []);
}
