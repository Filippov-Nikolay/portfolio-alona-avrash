import { gsap } from "@/shared/lib/gsap";

type RevealTarget = gsap.DOMTarget | null | undefined;
type TriggerTarget = gsap.DOMTarget | null | undefined;
type ScrollPosition = string | number | (() => string | number);

interface RevealOnScrollOptions {
    target: RevealTarget;
    from: gsap.TweenVars;
    to: gsap.TweenVars;
    trigger?: TriggerTarget;
    start?: ScrollPosition;
    end?: ScrollPosition;
    scrub?: boolean | number;
    toggleActions?: string;
    once?: boolean;
    invalidateOnRefresh?: boolean;
    fastScrollEnd?: boolean;
}

export function revealOnScroll({
    target,
    from,
    to,
    trigger,
    start = "top 76%",
    end,
    scrub,
    toggleActions,
    once,
    invalidateOnRefresh = true,
    fastScrollEnd,
}: RevealOnScrollOptions) {
    if (!target) {
        return;
    }

    return gsap.fromTo(target, from, {
        ...to,
        scrollTrigger: {
            trigger: trigger ?? target,
            start,
            end,
            scrub,
            toggleActions,
            once,
            invalidateOnRefresh,
            fastScrollEnd,
        },
    });
}
