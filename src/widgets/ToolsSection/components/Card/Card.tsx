"use client";

import { forwardRef, type ButtonHTMLAttributes, type CSSProperties } from "react";
import { cn } from "@/shared/lib/cn";
import type { Tool } from "@/entities/tool/model/tool";
import styles from "./Card.module.scss";

interface CardProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    tool: Tool;
    isActive?: boolean;
}

function peekStyle(index: number): CSSProperties {
    return {
        top: `-${60 * (index + 1)}px`,
        left: `${30 * (index + 1)}px`,
        transform: `rotate(${10 * (index + 1)}deg)`,
        zIndex: -(index + 2),
    };
}

function peekBlendSrc(src: string): string {
    return `/assets/tools/peek-blend/${src.split("/").pop()}`;
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
            <span className={styles.cardItems} aria-hidden="true">
                {tool.images.map((image, index) => (
                    <span key={image.src} className={styles.cardItem} style={peekStyle(index)}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={peekBlendSrc(image.src)} alt="" className={styles.cardItemImg} />
                    </span>
                ))}
            </span>

            <span className={styles.cardFolder} aria-hidden="true" />

            <span className={styles.cardBody}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tool.icon} alt="" className={styles.cardIconTool} />
                <span className={styles.cardLabelTool}>{tool.name}</span>
            </span>

            {/* arrow */}
        </button>
    );
});
