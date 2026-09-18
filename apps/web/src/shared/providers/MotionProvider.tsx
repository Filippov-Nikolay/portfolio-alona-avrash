"use client";

import { LazyMotion, domMax } from "framer-motion";

interface MotionProviderProps {
    children: React.ReactNode;
}

export function MotionProvider({ children }: MotionProviderProps) {
    return (
        <LazyMotion features={domMax} strict>
            {children}
        </LazyMotion>
    );
}

MotionProvider.displayName = "MotionProvider";
