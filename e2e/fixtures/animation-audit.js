// Test-only instrumentation of Turbopack module exports. No application globals
// or production bundle edits are needed to inspect the real GSAP instance.
(() => {
    const audit = (window.__animationAudit = {
        counts: { cssInit: 0, computedStyle: 0, rect: 0, refresh: 0, invalidations: 0 },
        longTasks: [],
        gsap: null,
        ScrollTrigger: null,
        errors: [],
    });
    const computed = window.getComputedStyle;
    window.getComputedStyle = function (...args) {
        audit.counts.computedStyle++;
        return computed.apply(this, args);
    };
    const rect = Element.prototype.getBoundingClientRect;
    Element.prototype.getBoundingClientRect = function (...args) {
        audit.counts.rect++;
        return rect.apply(this, args);
    };
    if (PerformanceObserver.supportedEntryTypes.includes("longtask"))
        new PerformanceObserver((list) =>
            audit.longTasks.push(
                ...list.getEntries().map((e) => ({ start: e.startTime, duration: e.duration }))
            )
        ).observe({ type: "longtask", buffered: true });
    const capture = (name, value) => {
        if (audit[name]) return;
        if (name === "gsap" && !value.plugins?.css) return;
        audit[name] = value;
        if (name === "ScrollTrigger")
            value.addEventListener("refresh", () => audit.counts.refresh++);
        if (name === "gsap") {
            const proto = value.plugins.css.prototype,
                init = proto.init;
            proto.init = function (...args) {
                audit.counts.cssInit++;
                return init.apply(this, args);
            };
            for (const Constructor of [value.core.Tween, value.core.Timeline]) {
                const invalidate = Constructor.prototype.invalidate;
                Constructor.prototype.invalidate = function (...args) {
                    audit.counts.invalidations++;
                    return invalidate.apply(this, args);
                };
            }
        }
    };
    const wrapPush = (object) => {
        let push = object.push;
        Object.defineProperty(object, "push", {
            configurable: true,
            get() {
                return function (...chunks) {
                    for (const chunk of chunks) {
                        if (!Array.isArray(chunk)) continue;
                        for (let i = 1; i < chunk.length; i++) {
                            const factory = chunk[i];
                            if (typeof factory !== "function") continue;
                            chunk[i] = function (ctx, ...args) {
                                const deferred = [];
                                const proxy = new Proxy(ctx, {
                                    get(target, key, receiver) {
                                        if (key !== "s") return Reflect.get(target, key, receiver);
                                        return function (exports, ...rest) {
                                            if (Array.isArray(exports)) {
                                                for (let j = 0; j < exports.length; j++) {
                                                    if (
                                                        exports[j] !== "gsap" &&
                                                        exports[j] !== "ScrollTrigger"
                                                    )
                                                        continue;
                                                    if (exports[j + 1] === 0) {
                                                        const value = exports[j + 2];
                                                        deferred.push([exports[j], () => value]);
                                                    } else if (typeof exports[j + 1] === "function")
                                                        deferred.push([exports[j], exports[j + 1]]);
                                                }
                                            } else
                                                for (const name of ["gsap", "ScrollTrigger"])
                                                    if (exports[name])
                                                        deferred.push([name, exports[name]]);
                                            return target.s(exports, ...rest);
                                        };
                                    },
                                });
                                const result = factory.call(this, proxy, ...args);
                                for (const [name, getter] of deferred) {
                                    try {
                                        const value = getter();
                                        if (value) capture(name, value);
                                    } catch (error) {
                                        audit.errors.push(String(error));
                                    }
                                }
                                return result;
                            };
                        }
                    }
                    return push.apply(this, chunks);
                };
            },
            set(next) {
                push = next;
            },
        });
        return object;
    };
    let current = wrapPush([]);
    Object.defineProperty(window, "TURBOPACK", {
        configurable: true,
        get() {
            return current;
        },
        set(next) {
            if (next !== current) current = wrapPush(next);
        },
    });
})();
