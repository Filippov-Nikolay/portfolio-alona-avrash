"use client";

import { useCallback, useLayoutEffect, useRef } from "react";

const ENTRY_INSET_PX = 24;
const STAGGER_MS = 70;
const MAX_STAGGER_MS = 210;

export function useWorksCardReveal() {
    const cardsRef = useRef(new Map<number, HTMLDivElement>());
    const callbacksRef = useRef(new Map<number, (el: HTMLDivElement | null) => void>());
    const revealedRef = useRef(new Set<number>());
    const observeRef = useRef<((id: number, element: HTMLDivElement) => void) | null>(null);
    const disconnectRef = useRef<((element: HTMLDivElement) => void) | null>(null);

    useLayoutEffect(() => {
        const cards = cardsRef.current;
        const revealed = revealedRef.current;
        const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
        const ids = new Map<HTMLElement, number>();

        const show = (element: HTMLElement) => {
            const id = ids.get(element);
            if (id !== undefined) revealed.add(id);
            element.dataset.worksReveal = "visible";
            element.style.removeProperty("--card-reveal-delay");
            observer.unobserve(element);
        };

        // Observe the layout wrapper, not the card that owns the hover effect.
        // Each entry starts one CSS compositor animation, independent of scroll
        // cadence and Safari's collapsing browser toolbar.
        const observer = new IntersectionObserver(
            (entries) => {
                let order = 0;
                for (const entry of entries.sort(
                    (a, b) => a.boundingClientRect.top - b.boundingClientRect.top
                )) {
                    const element = entry.target as HTMLElement;
                    if (element.dataset.worksReveal !== "pending") continue;
                    if (motion.matches || entry.boundingClientRect.bottom <= 0) {
                        show(element);
                    } else if (entry.isIntersecting) {
                        const id = ids.get(element);
                        if (id !== undefined) revealed.add(id);
                        observer.unobserve(element);
                        element.style.setProperty(
                            "--card-reveal-delay",
                            `${Math.min(order++ * STAGGER_MS, MAX_STAGGER_MS)}ms`
                        );
                        element.dataset.worksReveal = "entering";
                    }
                }
            },
            { rootMargin: `0px 0px -${ENTRY_INSET_PX}px 0px`, threshold: 0 }
        );

        const onAnimationEnd = (event: AnimationEvent) => {
            if (event.target === event.currentTarget) show(event.currentTarget as HTMLElement);
        };
        const onFocus = (event: FocusEvent) => show(event.currentTarget as HTMLElement);
        const observe = (id: number, element: HTMLDivElement) => {
            ids.set(element, id);
            element.addEventListener("animationend", onAnimationEnd);
            element.addEventListener("focusin", onFocus);
            // Never hide content that was already painted by SSR, or replay a
            // card when filtering, sorting, or scrolling back up the list.
            if (
                motion.matches ||
                revealed.has(id) ||
                element.getBoundingClientRect().top < window.innerHeight
            ) {
                show(element);
            } else {
                element.dataset.worksReveal = "pending";
                observer.observe(element);
            }
        };
        const disconnect = (element: HTMLDivElement) => {
            observer.unobserve(element);
            ids.delete(element);
            element.removeEventListener("animationend", onAnimationEnd);
            element.removeEventListener("focusin", onFocus);
            element.removeAttribute("data-works-reveal");
            element.style.removeProperty("--card-reveal-delay");
        };
        const onMotionChange = () => {
            if (motion.matches) for (const element of cards.values()) show(element);
        };

        observeRef.current = observe;
        disconnectRef.current = disconnect;
        for (const [id, element] of cards) observe(id, element);
        motion.addEventListener("change", onMotionChange);

        return () => {
            observer.disconnect();
            motion.removeEventListener("change", onMotionChange);
            for (const element of cards.values()) disconnect(element);
            observeRef.current = null;
            disconnectRef.current = null;
        };
    }, []);

    return useCallback((id: number) => {
        let callback = callbacksRef.current.get(id);
        if (!callback) {
            callback = (element: HTMLDivElement | null) => {
                const previous = cardsRef.current.get(id);
                if (previous === element) return;
                if (previous) disconnectRef.current?.(previous);
                if (element) {
                    cardsRef.current.set(id, element);
                    observeRef.current?.(id, element);
                } else {
                    cardsRef.current.delete(id);
                }
            };
            callbacksRef.current.set(id, callback);
        }
        return callback;
    }, []);
}
