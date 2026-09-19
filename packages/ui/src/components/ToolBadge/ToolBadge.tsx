import { cn } from "../../lib/cn";
import styles from "./ToolBadge.module.scss";

interface ToolBadgeProps {
    icon: string;
    iconAlt?: string;
    title: string;
    description: string;
    className?: string;
}

export function ToolBadge({ icon, iconAlt = "", title, description, className }: ToolBadgeProps) {
    return (
        <div className={cn(styles.badge, className)}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={icon} alt={iconAlt} className={styles.icon} />
            <span className={styles.text}>
                <span className={styles.title}>{title}</span>
                <span className={styles.description}>{description}</span>
            </span>
        </div>
    );
}
