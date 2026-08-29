const COMPLETE_EPSILON_PX = 2;
const RETARGET_EPSILON_PX = 12;
const STALL_FRAME_LIMIT = 5;
const DEFAULT_MAX_DURATION_MS = 1400;

let activeScrollToken = 0;

interface ManagedScrollOptions {
    behavior?: ScrollBehavior;
    maxDurationMs?: number;
}

interface ScrollToElementOptions extends ManagedScrollOptions {
    offset?: number;
}

function runManagedScroll(
    resolveTargetTop: () => number | null,
    { behavior = "smooth", maxDurationMs = DEFAULT_MAX_DURATION_MS }: ManagedScrollOptions = {}
) {
    const initialTarget = resolveTargetTop();
    if (initialTarget == null) return;

    const token = ++activeScrollToken;
    let rafId = 0;
    let lastY = window.scrollY;
    let stallFrames = 0;
    let lastIssuedTarget = initialTarget;

    const cleanup = () => {
        cancelAnimationFrame(rafId);
        window.removeEventListener("wheel", cancelScroll);
        window.removeEventListener("touchstart", cancelScroll);
        window.removeEventListener("pointerdown", cancelScroll);
        window.removeEventListener("keydown", cancelScroll);
    };

    const cancelScroll = () => {
        if (token !== activeScrollToken) return;
        activeScrollToken += 1;
        cleanup();
    };

    const issueScroll = (nextBehavior: ScrollBehavior) => {
        const nextTarget = resolveTargetTop();
        if (nextTarget == null) {
            cleanup();
            return null;
        }

        lastIssuedTarget = nextTarget;
        window.scrollTo({ top: nextTarget, behavior: nextBehavior });
        return nextTarget;
    };

    window.addEventListener("wheel", cancelScroll, { passive: true });
    window.addEventListener("touchstart", cancelScroll, { passive: true });
    window.addEventListener("pointerdown", cancelScroll, { passive: true });
    window.addEventListener("keydown", cancelScroll);

    issueScroll(behavior);
    const startedAt = performance.now();

    const tick = () => {
        if (token !== activeScrollToken) return;

        const targetTop = resolveTargetTop();
        if (targetTop == null) {
            cleanup();
            return;
        }

        const currentY = window.scrollY;
        const distance = targetTop - currentY;

        if (Math.abs(distance) <= COMPLETE_EPSILON_PX) {
            cleanup();
            return;
        }

        stallFrames = Math.abs(currentY - lastY) < 0.5 ? stallFrames + 1 : 0;

        const targetShifted = Math.abs(targetTop - lastIssuedTarget) > RETARGET_EPSILON_PX;
        if (targetShifted || stallFrames >= STALL_FRAME_LIMIT) {
            issueScroll("smooth");
            stallFrames = 0;
        }

        lastY = currentY;

        if (performance.now() - startedAt >= maxDurationMs) {
            if (Math.abs(targetTop - window.scrollY) > COMPLETE_EPSILON_PX) {
                issueScroll("auto");
            }
            cleanup();
            return;
        }

        rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);
}

export function scrollToElementId(
    id: string,
    { offset = 0, ...options }: ScrollToElementOptions = {}
) {
    runManagedScroll(() => {
        const el = document.getElementById(id);
        if (!el) return null;

        return Math.max(0, el.getBoundingClientRect().top + window.scrollY - offset);
    }, options);
}

export function scrollToTop(options?: ManagedScrollOptions) {
    runManagedScroll(() => 0, options);
}
