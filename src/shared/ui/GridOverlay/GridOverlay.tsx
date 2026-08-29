import { cn } from "@/shared/lib/cn";
import styles from "./GridOverlay.module.scss";

interface GridOverlayProps {
    opacity?: number;
    className?: string;
}

export function GridOverlay({ opacity = 1, className }: GridOverlayProps) {
    return <div className={cn(styles.grid, className)} style={{ opacity }} aria-hidden="true" />;
}
