import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const harness = vi.hoisted(() => ({
    cleanups: [] as (() => void)[],
    listeners: new Map<string, Set<() => void>>(),
    refresh: vi.fn(),
    sort: vi.fn(),
    isScrolling: vi.fn(() => false),
}));
vi.mock("react", () => ({
    useEffect: (effect: () => () => void) => harness.cleanups.push(effect()),
}));
vi.mock("@/shared/lib/gsap", () => ({
    ScrollTrigger: {
        refresh: harness.refresh,
        sort: harness.sort,
        isScrolling: harness.isScrolling,
        addEventListener: (name: string, callback: () => void) => {
            if (!harness.listeners.has(name)) harness.listeners.set(name, new Set());
            harness.listeners.get(name)!.add(callback);
        },
        removeEventListener: (name: string, callback: () => void) =>
            harness.listeners.get(name)?.delete(callback),
    },
}));

let mount: () => void;
let resize: () => void;
let documentMock: EventTarget & {
    body: { scrollHeight: number };
    documentElement: { scrollHeight: number };
};
const frames = new Map<number, FrameRequestCallback>();
let nextFrame = 0;
const flushFrame = () => {
    const callbacks = [...frames.values()];
    frames.clear();
    callbacks.forEach((callback) => callback(0));
};
const emit = (name: string) => harness.listeners.get(name)?.forEach((callback) => callback());
const pointer = (name: string, id = 1) =>
    documentMock.dispatchEvent(Object.assign(new Event(name), { pointerId: id }));

beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.clearAllMocks();
    harness.isScrolling.mockReturnValue(false);
    harness.listeners.clear();
    frames.clear();
    documentMock = Object.assign(new EventTarget(), {
        documentElement: { scrollHeight: 1000 },
        body: { scrollHeight: 1000 },
    });
    vi.stubGlobal("document", documentMock);
    vi.stubGlobal(
        "window",
        Object.assign(new EventTarget(), {
            innerWidth: 390,
            innerHeight: 844,
            matchMedia: () => ({ matches: true }),
            setTimeout,
            clearTimeout,
        })
    );
    vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
        frames.set(++nextFrame, callback);
        return nextFrame;
    });
    vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
    vi.stubGlobal(
        "ResizeObserver",
        class {
            constructor(callback: () => void) {
                resize = callback;
            }
            observe() {}
            disconnect() {}
        }
    );
    mount = (await import("./useScrollTriggerAutoRefresh")).useScrollTriggerAutoRefresh;
});

afterEach(() => {
    harness.cleanups
        .splice(0)
        .reverse()
        .forEach((cleanup) => cleanup());
    vi.unstubAllGlobals();
    vi.useRealTimers();
});

describe("shared ScrollTrigger refresh scheduling", () => {
    it("coalesces startup and layout requests until both touch and inertia end", () => {
        mount();
        pointer("pointerdown");
        documentMock.body.scrollHeight = 1200;
        resize();
        vi.advanceTimersByTime(900);
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();

        // scrollEnd can fire while a stationary finger still rests on screen.
        emit("scrollEnd");
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();

        harness.isScrolling.mockReturnValue(true);
        pointer("pointerup");
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();
        harness.isScrolling.mockReturnValue(false);
        emit("scrollEnd");
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith(true);
    });

    it("does not refresh again for pin spacing produced by its own refresh", () => {
        mount();
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith(true);
        documentMock.body.scrollHeight = 1600;
        emit("refresh");
        resize();
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledTimes(1);

        documentMock.body.scrollHeight = 1700;
        resize();
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledTimes(2);
        expect(harness.refresh).toHaveBeenLastCalledWith(true);
    });

    it("cleans up a pending refresh on navigation and starts the next mount cleanly", () => {
        mount();
        pointer("pointerdown");
        flushFrame();
        harness.cleanups.pop()!();
        vi.advanceTimersByTime(1000);
        pointer("pointerup");
        emit("scrollEnd");
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();
        expect([...harness.listeners.values()].every((listeners) => listeners.size === 0)).toBe(
            true
        );
        mount();
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith(true);
    });

    it("keeps shared listeners until the last consumer unmounts and handles touch cancellation", () => {
        mount();
        mount();
        expect(harness.listeners.get("refresh")?.size).toBe(1);
        pointer("pointerdown", 1);
        pointer("pointerdown", 2);
        harness.cleanups.pop()!();
        pointer("pointercancel", 1);
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();
        pointer("pointerup", 2);
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith(true);
    });
});
