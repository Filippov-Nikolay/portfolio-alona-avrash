"use client";

import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import type { Tool } from "@/entities/tool/model/tool";
import styles from "./Card.module.scss";
import { ArrowIcon } from "@/shared/ui";

interface CardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    tool: Tool;
    isActive?: boolean;
}

export const Card = forwardRef<HTMLButtonElement, CardProps>(function Card(
    { tool, isActive, className, ...buttonProps },
    ref
) {
    return (
        <button
            ref={ref}
            type="button"
            className={cn(styles.card, isActive && styles.cardActive, className)}
            aria-pressed={isActive}
            {...buttonProps}
        >
            <span className={styles.cardFolder} aria-hidden="true" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
                src="/assets/tools/v2/Rectangle-tool-active.svg"
                alt=""
                aria-hidden="true"
                className={styles.cardFolderActive}
            />

            <span className={styles.cardBody}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tool.icon} alt="" className={styles.cardIconTool} />
                <span className={styles.cardLabelTool}>{tool.name}</span>
            </span>

            <span className={styles.cardArrow} aria-hidden="true">
                <ArrowIcon className={styles.cardArrowIcon} />
            </span>
        </button>
    );
});
