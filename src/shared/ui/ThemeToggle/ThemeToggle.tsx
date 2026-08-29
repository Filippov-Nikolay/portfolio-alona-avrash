"use client";

import { m, AnimatePresence } from "framer-motion";
import { useThemeContext } from "@/shared/providers";
import { useMounted } from "@/shared/hooks/useMounted";
import { cn } from "@/shared/lib/cn";
import styles from "./ThemeToggle.module.scss";

interface ThemeToggleProps {
    className?: string;
}

// Иконка луны
function MoonIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
    );
}

// Иконка солнца
function SunIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" />
            <line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
            <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" />
            <line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
            <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
    );
}

const iconVariants = {
    initial: { opacity: 0, scale: 0.5, rotate: -30 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 0.5, rotate: 30 },
};

const transition = {
    duration: 0.2,
    ease: [0.25, 0.1, 0.25, 1] as const,
};

export function ThemeToggle({ className }: ThemeToggleProps) {
    const { theme, toggle } = useThemeContext();
    const mounted = useMounted();

    // Пока SSR — рендерим заглушку той же ширины/высоты (нет layout shift)
    if (!mounted) {
        return <div className={cn(styles.placeholder, className)} aria-hidden />;
    }

    const isDark = theme === "dark";

    return (
        <button
            type="button"
            onClick={toggle}
            className={cn(styles.toggle, className)}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Light mode" : "Dark mode"}
        >
            <AnimatePresence mode="wait" initial={false}>
                {isDark ? (
                    <m.span
                        key="moon"
                        variants={iconVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={transition}
                        className={styles.icon}
                    >
                        <MoonIcon />
                    </m.span>
                ) : (
                    <m.span
                        key="sun"
                        variants={iconVariants}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                        transition={transition}
                        className={styles.icon}
                    >
                        <SunIcon />
                    </m.span>
                )}
            </AnimatePresence>
        </button>
    );
}

ThemeToggle.displayName = "ThemeToggle";
