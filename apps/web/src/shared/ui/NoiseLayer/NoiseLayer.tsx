import { cn } from "@/shared/lib/cn";
import styles from "./NoiseLayer.module.scss";

interface NoiseLayerProps {
    opacity?: number;
    className?: string;
}

export function NoiseLayer({ opacity = 0.03, className }: NoiseLayerProps) {
    return <div className={cn(styles.noise, className)} style={{ opacity }} aria-hidden="true" />;
}
