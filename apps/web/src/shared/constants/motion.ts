// Framer Motion tokens — used by the presets in shared/lib/motion/*.
export const MOTION_DURATION = {
    fast: 0.2,
    base: 0.4,
    slow: 0.7,
};

export const MOTION_EASE = [0.25, 0.1, 0.25, 1] as const;

// GSAP tokens — used by scroll-triggered animations in each section's
// use*SectionAnimations hook (via shared/lib/animation/revealOnScroll).
// GSAP eases are named strings rather than cubic-bezier arrays, so they
// live in their own scale alongside Framer's.
export const GSAP_DURATION = {
    fast: 0.5,
    base: 0.7,
    slow: 0.9,
};

export const GSAP_EASE = {
    out: "power2.out",
    outStrong: "power3.out",
    overshoot: "back.out(2)",
    linear: "none",
};

// Distance scale for slide/blur entrance animations (in px).
export const MOTION_DISTANCE = {
    sm: 20,
    md: 32,
    lg: 64,
};

export const MOTION_BLUR = {
    sm: "6px",
    md: "12px",
    lg: "22px",
};
