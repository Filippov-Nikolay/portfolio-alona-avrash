"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, m } from "framer-motion";
import { useLocale } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/locales";
import { cn } from "@/shared/lib/cn";
import styles from "./LangSwitcher.module.scss";

const dropdownVariants = {
    hidden: { opacity: 0, y: -4, scaleY: 0.95 },
    visible: { opacity: 1, y: 0, scaleY: 1 },
};

interface LangSwitcherProps {
    className?: string;
    triggerClassName?: string;
}

export function LangSwitcher({ className, triggerClassName }: LangSwitcherProps) {
    const locale = useLocale();
    const router = useRouter();
    const pathname = usePathname();

    const [isOpen, setIsOpen] = useState(false);
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
        router.replace(pathname, { locale: code });
        setIsOpen(false);
    }

    const currentLabel = LOCALES.find((l) => l.code === locale)?.label ?? "ENG";

    return (
        <div ref={ref} className={cn(styles.wrapper, className)}>
            <button
                className={cn(styles.trigger, triggerClassName, isOpen && styles.triggerOpen)}
                onClick={() => setIsOpen((o) => !o)}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-label={`Language: ${currentLabel}`}
            >
                {currentLabel}
                <span className={cn(styles.dot, isOpen && styles.dotOpen)} aria-hidden="true" />
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
                        transition={{ duration: 0.15, ease: [0.25, 0.1, 0.25, 1] }}
                        style={{ transformOrigin: "top" }}
                    >
                        {LOCALES.map((lang) => (
                            <li key={lang.code} role="option" aria-selected={lang.code === locale}>
                                <button
                                    className={cn(
                                        styles.option,
                                        lang.code === locale && styles.optionActive
                                    )}
                                    onClick={() => switchLocale(lang.code)}
                                >
                                    {lang.label}
                                </button>
                            </li>
                        ))}
                    </m.ul>
                )}
            </AnimatePresence>
        </div>
    );
}
