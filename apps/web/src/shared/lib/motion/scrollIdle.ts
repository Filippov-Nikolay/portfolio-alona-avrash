import { cancelFrame, frame } from "framer-motion";

const SCROLL_IDLE_MS = 150;
const SCROLL_IDLE_FRAMES = 2;

let consumers = 0;
let lastScrollTime = Number.NEGATIVE_INFINITY;
let quietFrames = SCROLL_IDLE_FRAMES;
const pendingTasks = new Set<() => void>();

function isScrollIdle() {
    return (
        quietFrames >= SCROLL_IDLE_FRAMES && performance.now() - lastScrollTime >= SCROLL_IDLE_MS
    );
}

function flushWhenIdle() {
    if (pendingTasks.size === 0) return;
    if (!isScrollIdle()) {
        quietFrames++;
        frame.postRender(flushWhenIdle);
        return;
    }
    pendingTasks.forEach((task) => frame.render(task));
    pendingTasks.clear();
}

function handleScroll() {
    lastScrollTime = performance.now();
    quietFrames = 0;
}

export function retainScrollIdleTracking() {
    consumers++;
    if (consumers === 1) window.addEventListener("scroll", handleScroll, { passive: true });
    let released = false;
    return () => {
        if (released) return;
        released = true;
        consumers--;
        if (consumers > 0) return;
        window.removeEventListener("scroll", handleScroll);
        cancelFrame(flushWhenIdle);
        lastScrollTime = Number.NEGATIVE_INFINITY;
        quietFrames = SCROLL_IDLE_FRAMES;
        pendingTasks.clear();
    };
}

export function scheduleWhenScrollIdle(task: () => void) {
    if (isScrollIdle()) {
        frame.render(task);
        return;
    }
    pendingTasks.add(task);
    frame.postRender(flushWhenIdle);
}

export function cancelScrollIdleTask(task: () => void) {
    pendingTasks.delete(task);
    cancelFrame(task);
}
