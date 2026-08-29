import { gsap } from "@/shared/lib/gsap";
import { GSAP_DURATION, GSAP_EASE, MOTION_BLUR, MOTION_DISTANCE } from "@/shared/constants/motion";

type Target = gsap.DOMTarget | null | undefined;
type ScrollPosition = string | number | (() => string | number);

interface RevealHeaderOptions {
    /** The "> TITLE_" terminal chunk — slides in from the left. */
    leading: Target;
    /** An optional second element (subtitle, description) — slides in from the right. */
    trailing?: Target;
    trigger: Target;
    start?: ScrollPosition;
    reduced?: boolean | null;
}

// Shared "section header" entrance: the leading chunk blurs in from the
// left, an optional trailing element blurs in from the right, both on a
// single scroll-triggered timeline. Used by every section header so the
// motion feel stays consistent — tune it once here, not per section.
export function revealHeader({
    leading,
    trailing,
    trigger,
    start = "top 90%",
    reduced = false,
}: RevealHeaderOptions) {
    if (!leading) return;

    if (reduced) {
        gsap.set(trailing ? [leading, trailing] : leading, { clearProps: "all" });
        return;
    }

    const tl = gsap.timeline({
        defaults: { ease: GSAP_EASE.outStrong, force3D: true },
        scrollTrigger: {
            trigger,
            start,
            toggleActions: "play none none reverse",
            invalidateOnRefresh: true,
        },
    });

    tl.fromTo(
        leading,
        { x: -MOTION_DISTANCE.md, y: MOTION_DISTANCE.sm, filter: `blur(${MOTION_BLUR.md})` },
        { x: 0, y: 0, filter: "blur(0px)", duration: GSAP_DURATION.base },
        0
    );

    if (trailing) {
        tl.fromTo(
            trailing,
            { x: MOTION_DISTANCE.md, y: MOTION_DISTANCE.sm, filter: `blur(${MOTION_BLUR.md})` },
            { x: 0, y: 0, filter: "blur(0px)", duration: GSAP_DURATION.base },
            0.12
        );
    }

    return tl;
}
