import Link from "next/link";
import { PERIOD_OPTIONS, type PeriodDays } from "@/entities/analytics/lib/period";
import { cn } from "@/shared/lib/cn";
import styles from "./PeriodSwitcher.module.css";

interface PeriodSwitcherProps {
    basePath: string;
    days: PeriodDays;
}

export function PeriodSwitcher({ basePath, days }: PeriodSwitcherProps) {
    return (
        <div className={styles.wrap} role="group" aria-label="Time period">
            {PERIOD_OPTIONS.map((option) => (
                <Link
                    key={option.days}
                    href={`${basePath}?days=${option.days}`}
                    className={cn(styles.option, option.days === days && styles.optionActive)}
                    aria-current={option.days === days ? "page" : undefined}
                >
                    {option.label}
                </Link>
            ))}
        </div>
    );
}
