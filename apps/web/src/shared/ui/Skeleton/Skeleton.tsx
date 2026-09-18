import { cn } from "@/shared/lib/cn";
import styles from "./Skeleton.module.scss";

interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    rounded?: boolean;
    accent?: boolean;
    className?: string;
}

export function Skeleton({
    width,
    height,
    rounded = false,
    accent = false,
    className,
}: SkeletonProps) {
    return (
        <div
            className={cn(
                styles.skeleton,
                rounded && styles.rounded,
                accent && styles.accent,
                className
            )}
            style={{ width, height }}
            aria-hidden="true"
        />
    );
}
