const TOUCH_VIEWPORT_QUERY = "(hover: none) and (pointer: coarse)";

export function isTouchViewport() {
    return window.matchMedia(TOUCH_VIEWPORT_QUERY).matches;
}

export function createViewportResizeGuard() {
    const stabilizeHeight = isTouchViewport();
    let viewportWidth = window.innerWidth;

    return () => {
        const nextWidth = window.innerWidth;
        const widthChanged = Math.abs(nextWidth - viewportWidth) > 1;

        if (widthChanged) {
            viewportWidth = nextWidth;
        }

        return !stabilizeHeight || widthChanged;
    };
}
