"use client";

import { useCallback, useEffect, useRef } from "react";
import { useReducedMotion } from "framer-motion";

const ENTRY_START_RATIO = 1;
const SETTLE_RATIO = 0.5;
const MAX_BLUR_PX = 9;

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

function smoothstep(t: number) {
    return t * t * (3 - 2 * t);
}

function resetCardStyle(card: HTMLElement) {
    card.style.removeProperty("--reveal");
    card.style.filter = "";
    card.style.willChange = "auto";
}

export function useWorksCardReveal() {
    const cardsRef = useRef<Map<number, HTMLElement>>(new Map());
    const registerCallbacksRef = useRef<Map<number, (el: HTMLElement | null) => void>>(new Map());
    const reducedMotion = useReducedMotion();

    useEffect(() => {
        if (reducedMotion) return;

        const cardsMap = cardsRef.current;
        let frame = 0;

        const update = () => {
            frame = 0;
            const viewportHeight = window.innerHeight;
            const entryStart = viewportHeight * ENTRY_START_RATIO;
            const settle = viewportHeight * SETTLE_RATIO;
            const revealDistance = Math.max(entryStart - settle, 1);

            for (const card of cardsMap.values()) {
                const top = card.getBoundingClientRect().top;
                const progress = smoothstep(clamp01((entryStart - top) / revealDistance));
                card.style.setProperty("--reveal", progress.toFixed(3));

                const blurPx = (1 - progress) * MAX_BLUR_PX;
                card.style.filter = blurPx > 0.05 ? `blur(${blurPx.toFixed(2)}px)` : "";

                card.style.willChange = progress > 0 && progress < 1 ? "filter, transform" : "auto";
            }
        };

        const scheduleUpdate = () => {
            if (frame) return;
            frame = requestAnimationFrame(update);
        };

        update();
        window.addEventListener("scroll", scheduleUpdate, { passive: true });
        window.addEventListener("resize", scheduleUpdate);

        return () => {
            cancelAnimationFrame(frame);
            window.removeEventListener("scroll", scheduleUpdate);
            window.removeEventListener("resize", scheduleUpdate);
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
                    cardsRef.current.set(id, el);
                    return;
                }

                const previous = cardsRef.current.get(id);
                if (previous) resetCardStyle(previous);
                cardsRef.current.delete(id);
            };
            registerCallbacksRef.current.set(id, callback);
        }
        return callback;
    }, []);
}
