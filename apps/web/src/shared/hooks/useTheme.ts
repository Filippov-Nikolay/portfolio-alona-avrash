"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type Theme = "dark" | "light";

const STORAGE_KEY = "site-theme";
const COOKIE_KEY = "site-theme";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year
const DEFAULT_THEME: Theme = "light";

function getSystemTheme(): Theme {
    if (typeof window === "undefined") return DEFAULT_THEME;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function getInitialTheme(): Theme {
    if (typeof window === "undefined") return DEFAULT_THEME;
    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
    return stored ?? getSystemTheme();
}

// Временно отключает CSS transition на весь документ.
// Нужно при первом mount — чтобы начальная тема применялась мгновенно,
// без анимации из dark → light при загрузке страницы.
function withoutTransition(fn: () => void) {
    const style = document.createElement("style");
    style.textContent = "*, *::before, *::after { transition: none !important; }";
    document.head.appendChild(style);
    fn();
    // Убираем после следующего paint — transition снова работает
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            document.head.removeChild(style);
        });
    });
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(DEFAULT_THEME);
    const cssTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        return () => {
            if (cssTimerRef.current) {
                clearTimeout(cssTimerRef.current);
                cssTimerRef.current = null;
            }

            document.documentElement.classList.remove("is-theme-changing");
        };
    }, []);

    // Первый mount — читаем сохранённую тему и применяем БЕЗ анимации
    useEffect(() => {
        const initial = getInitialTheme();
        withoutTransition(() => {
            document.documentElement.setAttribute("data-theme", initial);
        });
        // Syncing React state with localStorage + DOM after mount - legitimate external system.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setTheme(initial);
    }, []);

    const toggle = useCallback(() => {
        const next =
            document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark";

        const applyTheme = () => {
            document.documentElement.setAttribute("data-theme", next);
            localStorage.setItem(STORAGE_KEY, next);
            // Кука нужна серверу — при следующем запросе layout читает её и рендерит
            // правильный data-theme без inline-скрипта (нет FART, нет React-предупреждений)
            document.cookie = `${COOKIE_KEY}=${next};path=/;max-age=${COOKIE_MAX_AGE};SameSite=Lax`;
        };

        setTheme(next as Theme);

        // View Transitions API — Chrome/Edge/Safari 18+.
        // Браузер делает снимок «до» и «после» и кросс-фейдит их на уровне
        // композитора: никаких конфликтов специфичности, никаких рывков.
        // vt-running отключает индивидуальные CSS transition на время VT —
        // иначе элементы анимируются дважды (CSS + снимок одновременно).
        const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

        if (!prefersReduced && "startViewTransition" in document) {
            const html = document.documentElement;
            html.classList.add("vt-running");
            const vt = (
                document as Document & {
                    startViewTransition: (cb: () => void) => { finished: Promise<void> };
                }
            ).startViewTransition(applyTheme);
            vt.finished.finally(() => html.classList.remove("vt-running"));
            return;
        }

        // CSS-фолбек для Firefox / prefers-reduced-motion.
        // is-theme-changing * имеет специфичность 11 — перекрывает любой
        // компонентный класс (10), поэтому все свойства анимируются синхронно.
        const html = document.documentElement;
        if (cssTimerRef.current) clearTimeout(cssTimerRef.current);
        html.classList.add("is-theme-changing");
        applyTheme();
        cssTimerRef.current = setTimeout(() => {
            html.classList.remove("is-theme-changing");
            cssTimerRef.current = null;
        }, 450);
    }, []);

    return { theme, toggle };
}
