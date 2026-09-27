type GuardedWindow = Window & { __avrashPerformanceMeasureGuard?: boolean };

if (process.env.NODE_ENV === "development") {
    const guardedWindow = window as GuardedWindow;

    if (!guardedWindow.__avrashPerformanceMeasureGuard) {
        guardedWindow.__avrashPerformanceMeasureGuard = true;

        const nativeMeasure = performance.measure.bind(performance);
        performance.measure = ((...args: Parameters<Performance["measure"]>) => {
            try {
                return nativeMeasure(...args);
            } catch (error) {
                if (
                    error instanceof TypeError &&
                    error.message.includes("cannot have a negative time stamp")
                ) {
                    return nativeMeasure(String(args[0]), { start: 0, duration: 0 });
                }

                throw error;
            }
        }) as Performance["measure"];
    }
}
