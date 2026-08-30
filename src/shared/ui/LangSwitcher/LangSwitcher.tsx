"use client";

import { useState, useRef, useEffect, useId } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/locales";
import { cn } from "@/shared/lib/cn";
import styles from "./LangSwitcher.module.scss";

const EASE = [0.25, 0.1, 0.25, 1] as const;
const CLOSE_EASE = [0.22, 1, 0.36, 1] as const;

const dropdownVariants = {
    hidden: { opacity: 0, y: -4, scaleY: 0.95, transition: { duration: 0.45, ease: CLOSE_EASE } },
    visible: {
        opacity: 1,
        y: 0,
        scaleY: 1,
        transition: { duration: 0.18, ease: EASE, staggerChildren: 0.04, delayChildren: 0.02 },
    },
};

const optionVariants = {
    hidden: { opacity: 0, x: -6 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.16, ease: EASE } },
};

const SWITCH_DELAY_MS = 180;

interface LangSwitcherProps {
    className?: string;
    triggerClassName?: string;
}

export function LangSwitcher({ className, triggerClassName }: LangSwitcherProps) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();
    const dotLayoutId = `lang-dot-${useId()}`;

    const [isOpen, setIsOpen] = useState(false);
    const [pendingLocale, setPendingLocale] = useState<Locale | null>(null);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function onOutsideClick(e: PointerEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        }
        function onEscape(e: KeyboardEvent) {
            if (e.key === "Escape") setIsOpen(false);
        }
        document.addEventListener("pointerdown", onOutsideClick);
        document.addEventListener("keydown", onEscape);
        return () => {
            document.removeEventListener("pointerdown", onOutsideClick);
            document.removeEventListener("keydown", onEscape);
        };
    }, []);

    function switchLocale(code: Locale) {
        if (code === locale) {
            setIsOpen(false);
            return;
        }

        setPendingLocale(code);
        setTimeout(() => {
            setIsOpen(false);
            setPendingLocale(null);
            router.replace(pathname, { locale: code });
        }, SWITCH_DELAY_MS);
    }

    const activeCode = pendingLocale ?? locale;
    const currentLabel = LOCALES.find((l) => l.code === locale)?.label ?? "ENG";

    return (
        <div ref={ref} className={cn(styles.wrapper, className)} data-open={isOpen || undefined}>
            <button
                className={cn(styles.trigger, triggerClassName, isOpen && styles.triggerOpen)}
                onClick={() => setIsOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={`Language: ${currentLabel}`}
            >
                {currentLabel}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <m.ul
                        className={styles.dropdown}
                        role="listbox"
                        variants={dropdownVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        style={{ transformOrigin: "top" }}
                    >
                        {LOCALES.map((lang) => {
                            const isActive = lang.code === activeCode;
                            return (
                                <m.li
                                    key={lang.code}
                                    role="option"
                                    aria-selected={isActive}
                                    variants={optionVariants}
                                >
                                    <button
                                        className={cn(
                                            styles.option,
                                            isActive && styles.optionActive
                                        )}
                                        onClick={() => switchLocale(lang.code)}
                                    >
                                        {isActive && (
                                            <m.span
                                                layoutId={dotLayoutId}
                                                className={styles.dot}
                                                transition={{
                                                    type: "spring",
                                                    stiffness: 500,
                                                    damping: 32,
                                                }}
                                            />
                                        )}
                                        {lang.label}
                                    </button>
                                </m.li>
                            );
                        })}
                    </m.ul>
                )}
            </AnimatePresence>
        </div>
    );
}
