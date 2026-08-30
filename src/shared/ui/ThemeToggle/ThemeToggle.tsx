"use client";

import { useState } from "react";
import { m, AnimatePresence } from "framer-motion";
import { useThemeContext } from "@/shared/providers";
import { useMounted } from "@/shared/hooks/useMounted";
import { cn } from "@/shared/lib/cn";
import { MoonIcon, SunIcon } from "@/shared/ui/Icon";
import styles from "./ThemeToggle.module.scss";

interface ThemeToggleProps {
    className?: string;
}

// Spins the outgoing icon away and the incoming one in — used both for the
// real theme switch (on click) and the hover preview below.
const iconVariants = {
    initial: { opacity: 0, scale: 0.4, rotate: -180 },
    animate: { opacity: 1, scale: 1, rotate: 0 },
    exit: { opacity: 0, scale: 0.4, rotate: 180 },
};

const transition = {
    duration: 0.35,
    ease: [0.25, 0.1, 0.25, 1] as const,
};

export function ThemeToggle({ className }: ThemeToggleProps) {
    const { theme, toggle } = useThemeContext();
    const mounted = useMounted();
    const [isHovered, setIsHovered] = useState(false);

    // Пока SSR — рендерим заглушку той же ширины/высоты (нет layout shift)
    if (!mounted) {
        return <div className={cn(styles.placeholder, className)} aria-hidden />;
    }

    const isDark = theme === "dark";
    const showMoon = isHovered ? !isDark : isDark;

    return (
        <button
            type="button"
            onClick={toggle}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            className={cn(styles.toggle, className)}
            aria-label={isDark ? "Switch to light theme" : "Switch to dark theme"}
            title={isDark ? "Light mode" : "Dark mode"}
        >
            <AnimatePresence mode="wait" initial={false}>
                {showMoon ? (
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
