"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";
import type { Variants, TargetAndTransition } from "framer-motion";

// Убирает пространственные трансформации из одного варианта,
// оставляет только opacity и transition (с обнулёнными задержками).
function stripVariant(v: unknown): unknown {
    if (typeof v !== "object" || v === null) return v;

    const { x, y, scale, rotate, skew, rotateX, rotateY, ...rest } = v as TargetAndTransition &
        Record<string, unknown>;

    // Подавляем предупреждение линтера — деструктурируем намеренно
    void x;
    void y;
    void scale;
    void rotate;
    void skew;
    void rotateX;
    void rotateY;

    if (rest.transition && typeof rest.transition === "object") {
        rest.transition = {
            ...(rest.transition as object),
            duration: 0.01,
            delay: 0,
            staggerChildren: 0,
            delayChildren: 0,
        };
    }

    return rest;
}

// Обходит все ключи Variants и стрипует трансформации из каждого.
function stripMotion(variants: Variants): Variants {
    return Object.fromEntries(
        Object.entries(variants).map(([key, value]) => [key, stripVariant(value)])
    ) as Variants;
}

export function useMotionVariants<T extends Variants>(variants: T): T {
    const reduced = useReducedMotion();
    return useMemo(() => (reduced ? (stripMotion(variants) as T) : variants), [reduced, variants]);
}
