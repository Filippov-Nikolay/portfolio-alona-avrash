"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { MotionValue } from "framer-motion";

const StatsSelectedChoreographyContext = createContext<MotionValue<number> | null>(null);

interface StatsSelectedChoreographyProviderProps {
    progress: MotionValue<number>;
    children: ReactNode;
}

export function StatsSelectedChoreographyProvider({
    progress,
    children,
}: StatsSelectedChoreographyProviderProps) {
    return (
        <StatsSelectedChoreographyContext.Provider value={progress}>
            {children}
        </StatsSelectedChoreographyContext.Provider>
    );
}

export function useStatsSelectedChoreographyProgress() {
    return useContext(StatsSelectedChoreographyContext);
}
