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
    fonts: EventTarget;
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
const touch = (name: string, count: number) =>
    documentMock.dispatchEvent(Object.assign(new Event(name), { touches: { length: count } }));

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
        fonts: new EventTarget(),
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
    it("does not remeasure a settled page on arbitrary startup timers", () => {
        mount();
        mount();
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledTimes(1);
        for (const delay of [250, 550, 1000]) {
            vi.advanceTimersByTime(delay);
            flushFrame();
        }
        expect(harness.refresh).toHaveBeenCalledTimes(1);
    });

    it("refreshes font-dependent geometry after fonts load, even without a document resize", () => {
        mount();
        flushFrame();
        harness.refresh.mockClear();
        touch("touchstart", 1);
        documentMock.fonts.dispatchEvent(new Event("loadingdone"));
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();
        touch("touchend", 0);
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith();
        harness.cleanups.pop()!();
        documentMock.fonts.dispatchEvent(new Event("loadingdone"));
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledTimes(1);
    });

    it("keeps a native pan blocked after pointercancel until all fingers lift", () => {
        mount();
        touch("touchstart", 2);
        pointer("pointerdown");
        pointer("pointercancel");
        vi.advanceTimersByTime(900);
        emit("scrollEnd");
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();
        touch("touchend", 1);
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();
        touch("touchend", 0);
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith();
    });

    it("requires native scroll to settle even when GSAP reports an early scrollEnd", () => {
        mount();
        // A delayed mount refresh must remain blocked throughout the gesture.
        pointer("pointerdown");
        vi.advanceTimersByTime(900);
        window.dispatchEvent(new Event("scroll"));
        pointer("pointerup");
        emit("scrollEnd");
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();
        vi.advanceTimersByTime(200);
        window.dispatchEvent(new Event("scroll"));
        emit("scrollEnd");
        flushFrame();
        vi.advanceTimersByTime(249);
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith();
    });

    it.each([true, false])(
        "ignores browser chrome resizing with ResizeObserver first: %s",
        (observerFirst) => {
            mount();
            vi.advanceTimersByTime(900);
            flushFrame();
            harness.refresh.mockClear();
            window.innerHeight = 740;
            documentMock.body.scrollHeight = 1020;
            if (observerFirst) resize();
            window.dispatchEvent(new Event("resize"));
            if (!observerFirst) resize();
            // Safari can also dispatch another resize with unchanged dimensions.
            window.dispatchEvent(new Event("resize"));
            flushFrame();
            expect(harness.refresh).not.toHaveBeenCalled();

            // A real orientation/width change must still invalidate pin geometry.
            window.innerWidth = 844;
            resize();
            window.dispatchEvent(new Event("resize"));
            flushFrame();
            expect(harness.refresh).toHaveBeenCalledExactlyOnceWith();
        }
    );

    it("refreshes a layout change held during chrome resizing once the chrome settles", () => {
        mount();
        flushFrame();
        emit("refresh");
        harness.refresh.mockClear();
        window.innerHeight = 740;
        window.dispatchEvent(new Event("resize"));
        resize();
        documentMock.body.scrollHeight = 1300;
        resize();
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();

        vi.advanceTimersByTime(1199);
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith();
    });

    it("waits for the last chrome resize before the settled refresh", () => {
        mount();
        flushFrame();
        emit("refresh");
        harness.refresh.mockClear();
        window.innerHeight = 740;
        window.dispatchEvent(new Event("resize"));
        documentMock.body.scrollHeight = 1300;
        resize();

        vi.advanceTimersByTime(900);
        window.innerHeight = 780;
        window.dispatchEvent(new Event("resize"));
        vi.advanceTimersByTime(300);
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();

        vi.advanceTimersByTime(899);
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();
        vi.advanceTimersByTime(1);
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith();
    });

    it("skips the settled refresh when the document is back to its measured height", () => {
        mount();
        flushFrame();
        emit("refresh");
        harness.refresh.mockClear();
        window.innerHeight = 740;
        documentMock.body.scrollHeight = 1020;
        resize();
        window.dispatchEvent(new Event("resize"));
        documentMock.body.scrollHeight = 1000;
        vi.advanceTimersByTime(1200);
        flushFrame();
        expect(harness.refresh).not.toHaveBeenCalled();
    });

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
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith();
    });

    it("does not refresh again for pin spacing produced by its own refresh", () => {
        mount();
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith();
        documentMock.body.scrollHeight = 1600;
        emit("refresh");
        resize();
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledTimes(1);

        documentMock.body.scrollHeight = 1700;
        resize();
        flushFrame();
        expect(harness.refresh).toHaveBeenCalledTimes(2);
        expect(harness.refresh).toHaveBeenLastCalledWith();
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
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith();
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
        expect(harness.refresh).toHaveBeenCalledExactlyOnceWith();
    });
});
