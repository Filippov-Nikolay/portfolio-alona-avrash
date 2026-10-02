"use client";

import { useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { cn } from "@/shared/lib/cn";
import styles from "./ReportTabs.module.css";

interface ReportTab {
    id: string;
    label: string;
    icon: ReactNode;
    description: string;
    content: ReactNode;
}

interface ReportTabsProps {
    label: string;
    tabs: ReportTab[];
}

export function ReportTabs({ label, tabs }: ReportTabsProps) {
    const searchParams = useSearchParams();
    const requested = searchParams.get("view");
    const active = tabs.find((tab) => tab.id === requested)?.id ?? tabs[0]?.id;
    const [visited, setVisited] = useState(() => new Set([active]));
    const id = useId();
    const buttons = useRef<(HTMLButtonElement | null)[]>([]);

    function select(value: string) {
        setVisited((current) => new Set([...current, active, value]));
        const url = new URL(window.location.href);
        if (value === tabs[0]?.id) url.searchParams.delete("view");
        else url.searchParams.set("view", value);
        // Keep the current report data and scroll position when switching views.
        window.history.replaceState(null, "", url);
    }

    function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
        let next: number;
        if (event.key === "ArrowRight") next = (index + 1) % tabs.length;
        else if (event.key === "ArrowLeft") next = (index - 1 + tabs.length) % tabs.length;
        else if (event.key === "Home") next = 0;
        else if (event.key === "End") next = tabs.length - 1;
        else return;
        event.preventDefault();
        select(tabs[next]!.id);
        buttons.current[next]?.focus();
    }

    return (
        <div className={styles.report}>
            <div className={styles.tabs} role="tablist" aria-label={label}>
                {tabs.map((tab, index) => (
                    <button
                        key={tab.id}
                        ref={(element) => {
                            buttons.current[index] = element;
                        }}
                        id={`${id}-${tab.id}-tab`}
                        type="button"
                        role="tab"
                        aria-selected={active === tab.id}
                        aria-controls={`${id}-${tab.id}-panel`}
                        tabIndex={active === tab.id ? 0 : -1}
                        className={cn(styles.tab, active === tab.id && styles.active)}
                        onClick={() => select(tab.id)}
                        onKeyDown={(event) => onKeyDown(event, index)}
                    >
                        <span className={styles.icon} aria-hidden="true">
                            {tab.icon}
                        </span>
                        {tab.label}
                    </button>
                ))}
            </div>
            {tabs.map((tab) => (
                <div
                    key={tab.id}
                    id={`${id}-${tab.id}-panel`}
                    role="tabpanel"
                    aria-labelledby={`${id}-${tab.id}-tab`}
                    hidden={active !== tab.id}
                    tabIndex={0}
                    className={styles.panel}
                >
                    <p className={styles.description}>{tab.description}</p>
                    {(active === tab.id || visited.has(tab.id)) && tab.content}
                </div>
            ))}
        </div>
    );
}
