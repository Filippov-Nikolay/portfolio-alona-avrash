"use client";

import { useRef } from "react";
import { useReducedMotionPreference } from "@/shared/hooks/useReducedMotionPreference";
import { useGSAP, gsap } from "@/shared/lib/gsap";

// The middle digit of "404" is always 0, so it never has to move - only
// the first and last reel count up, sharing this one target.
const TARGET_DIGIT = 4;

function setDigitPosition(container: HTMLElement, digit: number) {
    const reels = container.querySelectorAll<HTMLElement>("[data-reel-move]");
    reels.forEach((reel) => {
        reel.style.transform = `translateY(${-digit}em)`;
    });
}

export function useNotFoundOdometer() {
    const reduced = useReducedMotionPreference();
    const containerRef = useRef<HTMLSpanElement>(null);

    useGSAP(
        () => {
            const container = containerRef.current;
            if (!container) return;

            if (reduced) {
                setDigitPosition(container, TARGET_DIGIT);
                return;
            }

            setDigitPosition(container, 0);

            const state = { current: 0 };
            gsap.to(state, {
                current: TARGET_DIGIT,
                duration: 0.9,
                delay: 0.15,
                ease: "power2.out",
                snap: { current: 1 },
                onUpdate: () => setDigitPosition(container, state.current),
            });
        },
        { dependencies: [reduced] }
    );

    return { containerRef };
}
