import type { ElementType, HTMLAttributes, Ref } from "react";
import { cn } from "@/shared/lib/cn";
import styles from "./Section.module.scss";

interface SectionProps extends HTMLAttributes<HTMLElement> {
    as?: "section" | "footer" | "div" | "article";
    ref?: Ref<HTMLElement>;
}

export function Section({ as: Tag = "section", className, children, ref, ...props }: SectionProps) {
    const Component = Tag as ElementType;
    return (
        <Component ref={ref} className={cn(styles.section, className)} {...props}>
            {children}
        </Component>
    );
}
