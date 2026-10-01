"use client";

import { useId, useLayoutEffect, useRef, useState, type KeyboardEvent } from "react";
import { Check, ChevronDown } from "lucide-react";
import { SITE_LOCALES, type SiteLocale } from "@avrash/content-schema";
import styles from "./CvLanguageSelect.module.css";

export function CvLanguageSelect({
    value,
    disabled,
    onChange,
}: {
    value: SiteLocale;
    disabled: boolean;
    onChange: (locale: SiteLocale) => void;
}) {
    const id = useId();
    const root = useRef<HTMLDivElement>(null);
    const trigger = useRef<HTMLButtonElement>(null);
    const menu = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [active, setActive] = useState(0);
    const [position, setPosition] = useState({ above: false, maxHeight: 240 });
    const selectedIndex = SITE_LOCALES.findIndex((locale) => locale.code === value);
    const selected = SITE_LOCALES[selectedIndex];
    const expanded = open && !disabled;
    const optionId = (index: number) => `${id}-option-${index}`;

    // A save must also clear the open state, so re-enabling cannot reopen the menu.
    if (disabled && open) setOpen(false);

    useLayoutEffect(() => {
        if (!expanded) return;

        function positionMenu() {
            if (!trigger.current || !menu.current) return;
            const rect = trigger.current.getBoundingClientRect();
            const viewport = window.visualViewport;
            const top = viewport?.offsetTop ?? 0;
            const bottom = top + (viewport?.height ?? window.innerHeight);
            const below = Math.max(0, bottom - rect.bottom - 14);
            const above = Math.max(0, rect.top - top - 14);
            const height = Math.min(menu.current.scrollHeight + 2, 240);
            const useAbove = below < height && above > below;
            setPosition({ above: useAbove, maxHeight: Math.min(240, useAbove ? above : below) });
        }
        function closeOutside(event: PointerEvent) {
            if (!root.current?.contains(event.target as Node)) setOpen(false);
        }
        function closeOnScroll(event: Event) {
            if (!(event.target instanceof Node) || !menu.current?.contains(event.target)) {
                setOpen(false);
            }
        }

        positionMenu();
        document.addEventListener("pointerdown", closeOutside);
        window.addEventListener("scroll", closeOnScroll, true);
        window.addEventListener("resize", positionMenu);
        window.visualViewport?.addEventListener("resize", positionMenu);
        return () => {
            document.removeEventListener("pointerdown", closeOutside);
            window.removeEventListener("scroll", closeOnScroll, true);
            window.removeEventListener("resize", positionMenu);
            window.visualViewport?.removeEventListener("resize", positionMenu);
        };
    }, [expanded]);

    useLayoutEffect(() => {
        const list = menu.current;
        const option = list?.children[active] as HTMLElement | undefined;
        if (!expanded || !list || !option) return;
        if (option.offsetTop < list.scrollTop) list.scrollTop = option.offsetTop;
        else if (option.offsetTop + option.offsetHeight > list.scrollTop + list.clientHeight) {
            list.scrollTop = option.offsetTop + option.offsetHeight - list.clientHeight;
        }
    }, [active, expanded]);

    function choose(index: number, restoreFocus = true) {
        onChange(SITE_LOCALES[index].code);
        setOpen(false);
        if (restoreFocus) trigger.current?.focus({ preventScroll: true });
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (disabled) return;
        const last = SITE_LOCALES.length - 1;
        if (event.key === "Escape" && expanded) {
            event.preventDefault();
            event.stopPropagation();
            setOpen(false);
            trigger.current?.focus({ preventScroll: true });
        } else if (event.key === "Tab") {
            if (expanded) choose(active, false);
        } else if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (expanded) choose(active);
            else {
                setActive(selectedIndex);
                setOpen(true);
            }
        } else if (["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) {
            event.preventDefault();
            setActive(
                event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? last
                      : !expanded
                        ? selectedIndex
                        : (active + (event.key === "ArrowDown" ? 1 : last)) % SITE_LOCALES.length
            );
            setOpen(true);
        } else if (event.key.length === 1 && !event.ctrlKey && !event.metaKey && !event.altKey) {
            const match = SITE_LOCALES.findIndex((locale) =>
                locale.name.toLowerCase().startsWith(event.key.toLowerCase())
            );
            if (match >= 0) {
                event.preventDefault();
                setActive(match);
                setOpen(true);
            }
        }
    }

    return (
        <div
            ref={root}
            className={styles.field}
            onKeyDown={handleKeyDown}
            onBlur={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
            }}
        >
            <label id={`${id}-label`} htmlFor={`${id}-trigger`} className={styles.label}>
                Language
            </label>
            <div className={styles.control}>
                <button
                    ref={trigger}
                    id={`${id}-trigger`}
                    type="button"
                    role="combobox"
                    aria-labelledby={`${id}-label`}
                    aria-haspopup="listbox"
                    aria-controls={expanded ? `${id}-listbox` : undefined}
                    aria-expanded={expanded}
                    aria-activedescendant={expanded ? optionId(active) : undefined}
                    className={styles.trigger}
                    disabled={disabled}
                    onClick={() => {
                        setActive(selectedIndex);
                        setOpen(!expanded);
                    }}
                >
                    <span className={styles.code} aria-hidden="true">
                        {selected.label}
                    </span>
                    <span className={styles.name}>{selected.name}</span>
                    <ChevronDown size={16} className={styles.chevron} aria-hidden="true" />
                </button>
                {expanded && (
                    <div
                        ref={menu}
                        id={`${id}-listbox`}
                        role="listbox"
                        aria-labelledby={`${id}-label`}
                        className={styles.menu}
                        data-above={position.above || undefined}
                        style={{ maxHeight: position.maxHeight }}
                    >
                        {SITE_LOCALES.map(({ code, label, name }, index) => (
                            <button
                                key={code}
                                id={optionId(index)}
                                type="button"
                                role="option"
                                aria-selected={value === code}
                                tabIndex={-1}
                                className={styles.option}
                                data-highlighted={index === active || undefined}
                                onMouseDown={(event) => event.preventDefault()}
                                onPointerMove={(event) => {
                                    if (event.pointerType === "mouse") setActive(index);
                                }}
                                onClick={() => choose(index)}
                            >
                                <span className={styles.code} aria-hidden="true">
                                    {label}
                                </span>
                                <span className={styles.name}>{name}</span>
                                {value === code && (
                                    <Check size={16} className={styles.check} aria-hidden="true" />
                                )}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
