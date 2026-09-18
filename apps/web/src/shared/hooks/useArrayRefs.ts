"use client";

import { useCallback, useRef } from "react";

export function useArrayRefs<T>() {
    const refs = useRef<Array<T | null>>([]);
    const refSetters = useRef<Record<number, (node: T | null) => void>>({});

    const setRef = useCallback((index: number) => {
        if (!refSetters.current[index]) {
            refSetters.current[index] = (node: T | null) => {
                refs.current[index] = node;
            };
        }

        return refSetters.current[index];
    }, []);

    return {
        refs,
        setRef,
    };
}
