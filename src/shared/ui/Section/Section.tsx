import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import styles from "./Section.module.scss";

interface SectionProps extends HTMLAttributes<HTMLElement> {
    as?: "section" | "footer" | "div" | "article";
}

export function Section({ as: Tag = "section", className, children, ...props }: SectionProps) {
    return (
        <Tag className={cn(styles.section, className)} {...props}>
            {children}
        </Tag>
    );
}
