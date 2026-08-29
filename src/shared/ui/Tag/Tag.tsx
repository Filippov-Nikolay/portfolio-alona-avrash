import { cn } from "@/shared/lib/cn";
import styles from "./Tag.module.scss";

type TagVariant = "default" | "purple" | "orange";

interface TagProps {
    children: React.ReactNode;
    variant?: TagVariant;
    className?: string;
}

export function Tag({ children, variant = "default", className }: TagProps) {
    return <span className={cn(styles.tag, styles[variant], className)}>{children}</span>;
}
