import { gsap } from "@/shared/lib/gsap";

type ParallaxTarget = gsap.DOMTarget | null | undefined;
type TriggerTarget = gsap.DOMTarget | null | undefined;
type ScrollPosition = string | number | (() => string | number);

interface ParallaxYOptions {
    target: ParallaxTarget;
    trigger?: TriggerTarget;
    from?: number;
    to?: number;
    start?: ScrollPosition;
    end?: ScrollPosition;
    scrub?: boolean | number;
    invalidateOnRefresh?: boolean;
}

export function parallaxY({
    target,
    trigger,
    from = -3,
    to = 3,
    start = "top bottom",
    end = "bottom top",
    scrub = 0.8,
    invalidateOnRefresh = true,
}: ParallaxYOptions) {
    if (!target) {
        return;
    }

    return gsap.fromTo(
        target,
        { yPercent: from },
        {
            yPercent: to,
            ease: "none",
            scrollTrigger: {
                trigger: trigger ?? target,
                start,
                end,
                scrub,
                invalidateOnRefresh,
            },
        }
    );
}
