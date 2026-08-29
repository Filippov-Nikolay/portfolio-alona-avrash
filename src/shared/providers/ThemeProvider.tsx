"use client";

import { createContext, useContext } from "react";
import { useTheme, type Theme } from "@/shared/hooks/useTheme";

interface ThemeContextValue {
    theme: Theme;
    toggle: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

interface ThemeProviderProps {
    children: React.ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
    const value = useTheme();
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeContext(): ThemeContextValue {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error("useThemeContext must be used inside ThemeProvider");
    return ctx;
}

ThemeProvider.displayName = "ThemeProvider";
