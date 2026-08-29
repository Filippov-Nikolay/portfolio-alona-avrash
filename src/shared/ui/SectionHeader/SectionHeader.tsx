import { forwardRef } from "react";
import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import styles from "./SectionHeader.module.scss";

interface SectionHeaderProps extends HTMLAttributes<HTMLDivElement> {
    /** Section title, shown after the prompt glyph. */
    title: string;
    /** Prompt glyph before the title — defaults to a terminal-style ">". */
    prompt?: string;
    /** Show the blinking cursor after the title. Defaults to true. */
    cursor?: boolean;
}

// Reusable "terminal-style" section heading (`> TITLE_`) used across the
// demo sections. Forwards its ref so scroll-triggered animations (see
// shared/lib/animation/revealHeader) can target the wrapper directly.
export const SectionHeader = forwardRef<HTMLDivElement, SectionHeaderProps>(
    ({ title, prompt = ">", cursor = true, className, ...props }, ref) => {
        return (
            <div ref={ref} className={cn(styles.wrap, className)} {...props}>
                <span className={styles.prompt} aria-hidden="true">
                    {prompt}
                </span>
                <h2 className={styles.title}>
                    {title}
                    {cursor && (
                        <span className={styles.cursor} aria-hidden="true">
                            _
                        </span>
                    )}
                </h2>
            </div>
        );
    }
);

SectionHeader.displayName = "SectionHeader";
