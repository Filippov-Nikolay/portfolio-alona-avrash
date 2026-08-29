"use client";

import type { HTMLAttributes } from "react";
import { cn } from "@/shared/lib/cn";
import styles from "./GlowCard.module.scss";

type GlowCardProps = HTMLAttributes<HTMLDivElement>;

export function GlowCard({ className, children, ...props }: GlowCardProps) {
    return (
        <div className={cn(styles.card, styles.glow, className)} {...props}>
            {children}
        </div>
    );
}

GlowCard.displayName = "GlowCard";
