"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { PERIOD_OPTIONS, type PeriodDays } from "@/entities/analytics/lib/period";
import { cn } from "@/shared/lib/cn";
import styles from "./PeriodSwitcher.module.css";

interface PeriodSwitcherProps {
    basePath: string;
    days: PeriodDays;
}

export function PeriodSwitcher({ basePath, days }: PeriodSwitcherProps) {
    const view = useSearchParams().get("view");
    return (
        <div className={styles.wrap} role="group" aria-label="Time period">
            {PERIOD_OPTIONS.map((option) => (
                <Link
                    key={option.days}
                    href={`${basePath}?${new URLSearchParams({ days: String(option.days), ...(view ? { view } : {}) })}`}
                    className={cn(styles.option, option.days === days && styles.optionActive)}
                    aria-current={option.days === days ? "page" : undefined}
                >
                    {option.label}
                </Link>
            ))}
        </div>
    );
}
