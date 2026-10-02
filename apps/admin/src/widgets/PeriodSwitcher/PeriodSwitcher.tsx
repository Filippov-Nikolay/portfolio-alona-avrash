"use client";

import Link from "next/link";
import { useOptimistic, useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { PERIOD_OPTIONS, type PeriodDays } from "@/entities/analytics/lib/period";
import { cn } from "@/shared/lib/cn";
import styles from "./PeriodSwitcher.module.css";

interface PeriodSwitcherProps {
    basePath: string;
    days: PeriodDays;
}

export function PeriodSwitcher({ basePath, days }: PeriodSwitcherProps) {
    const searchParams = useSearchParams();
    const router = useRouter();
    const [prefetchDays, setPrefetchDays] = useState<PeriodDays | null>(null);
    const [pending, startTransition] = useTransition();
    const [selectedDays, setSelectedDays] = useOptimistic(days);
    return (
        <div className={styles.wrap} role="group" aria-label="Time period" aria-busy={pending}>
            {PERIOD_OPTIONS.map((option) => {
                const params = new URLSearchParams(searchParams.toString());
                params.set("days", String(option.days));
                const href = `${basePath}?${params}`;
                const loading = pending && selectedDays === option.days;
                return (
                    <Link
                        key={option.days}
                        href={href}
                        scroll={false}
                        prefetch={prefetchDays === option.days}
                        onMouseEnter={() => setPrefetchDays(option.days)}
                        onFocus={() => setPrefetchDays(option.days)}
                        onTouchStart={() => setPrefetchDays(option.days)}
                        onNavigate={(event) => {
                            event.preventDefault();
                            if (!pending && option.days === days) return;
                            startTransition(() => {
                                setSelectedDays(option.days);
                                router.push(href, { scroll: false });
                            });
                        }}
                        className={cn(
                            styles.option,
                            option.days === selectedDays && styles.optionActive
                        )}
                        aria-current={option.days === days ? "page" : undefined}
                        aria-label={option.label}
                        data-loading={loading || undefined}
                    >
                        <span className={styles.label}>{option.label}</span>
                        {loading && (
                            <LoaderCircle size={14} className={styles.spinner} aria-hidden="true" />
                        )}
                    </Link>
                );
            })}
            <span className={styles.status} role="status">
                {pending
                    ? `Loading ${selectedDays === 365 ? "1Y" : `${selectedDays}D`} report`
                    : ""}
            </span>
        </div>
    );
}
