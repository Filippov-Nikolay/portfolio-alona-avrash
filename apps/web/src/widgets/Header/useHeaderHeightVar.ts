"use client";

import { useLayoutEffect, type RefObject } from "react";

const HEADER_HEIGHT_VAR = "--header-height";

export function useHeaderHeightVar(headerRef: RefObject<HTMLElement | null>) {
    useLayoutEffect(() => {
        const header = headerRef.current;
        if (!header) return;

        const root = document.documentElement;

        const setHeight = () => {
            root.style.setProperty(HEADER_HEIGHT_VAR, `${header.getBoundingClientRect().height}px`);
        };

        setHeight();
        const resizeObserver = new ResizeObserver(setHeight);
        resizeObserver.observe(header);

        return () => {
            resizeObserver.disconnect();
        };
    }, [headerRef]);
}
