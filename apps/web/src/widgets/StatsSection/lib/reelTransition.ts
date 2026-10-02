export const REEL_TRANSITION_MS = 220;
const clamp01 = (value: number) => Math.max(0, Math.min(1, value));

function ease(progress: number) {
    // Invert x(t) for the original cubic-bezier(.22, 1, .36, 1).
    // Its derivative is positive throughout [0, 1]; Newton converges quickly.
    // Motion's lower-precision bezier approximation visibly differs at large scales.
    let t = progress;
    for (let i = 0; i < 8; i++) {
        const error = ((0.58 * t - 0.24) * t + 0.66) * t - progress;
        if (Math.abs(error) < 1e-10) break;
        t -= error / ((1.74 * t - 0.48) * t + 0.66);
    }
    return 1 - (1 - t) ** 3;
}

export interface ReelTransition {
    from: number;
    to: number;
    start: number;
    duration: number;
    reversingStart: number;
    shortening: number;
}

export function createReelTransition(): ReelTransition {
    return { from: 0, to: 0, start: 0, duration: 0, reversingStart: 0, shortening: 1 };
}

export function sampleReel(transition: ReelTransition, now: number) {
    const progress = transition.duration
        ? clamp01((now - transition.start) / transition.duration)
        : 1;
    if (progress === 1) return transition.to;
    if (progress === 0) return transition.from;
    return transition.from + (transition.to - transition.from) * ease(progress);
}

export function retargetReel(
    transition: ReelTransition,
    to: number,
    now: number,
    immediate: boolean
) {
    if (immediate) {
        Object.assign(transition, {
            from: to,
            to,
            start: now,
            duration: 0,
            reversingStart: to,
            shortening: 1,
        });
        return;
    }
    if (transition.to === to) return;
    const from = sampleReel(transition, now);
    const running = now < transition.start + transition.duration;
    // Preserve CSS transition reversal shortening as well as its timing curve.
    // https://drafts.csswg.org/css-transitions/#reversing
    const shortening =
        running && to === transition.reversingStart
            ? clamp01(
                  Math.abs(
                      ease(clamp01((now - transition.start) / transition.duration)) *
                          transition.shortening +
                          1 -
                          transition.shortening
                  )
              )
            : 1;
    const reversingStart = running && to === transition.reversingStart ? transition.to : from;
    Object.assign(transition, {
        from,
        to,
        start: now,
        duration: REEL_TRANSITION_MS * shortening,
        reversingStart,
        shortening,
    });
}
