"use client";

import {
    useEffect,
    useState,
    type CSSProperties,
    type HTMLAttributes,
    type ReactNode,
} from "react";
import { cn } from "@/shared/lib/cn";
import styles from "./GlassSurface.module.scss";

type GlassTone = "neutral" | "accent";
type GlassIntensity = "soft" | "medium" | "strong";
type GlassPreset = "default" | "hero" | "showcase";
type GlassState = "default" | "active";
type GlassReveal = "none" | "clip-up";
type GlassSurfaceTag = "article" | "aside" | "div" | "section";

interface GlassSurfaceProps extends HTMLAttributes<HTMLElement> {
    as?: GlassSurfaceTag;
    children: ReactNode;
    className?: string;
    contentClassName?: string;
    tone?: GlassTone;
    intensity?: GlassIntensity;
    interactive?: boolean;
    preset?: GlassPreset;
    state?: GlassState;
    reveal?: GlassReveal;
    revealed?: boolean;
    revealDelayMs?: number;
}

export function GlassSurface({
    as,
    children,
    className,
    contentClassName,
    tone = "neutral",
    intensity = "medium",
    interactive = true,
    preset = "default",
    state = "default",
    reveal = "none",
    revealed = true,
    revealDelayMs = 0,
    style,
    ...props
}: GlassSurfaceProps) {
    const Tag = as ?? "div";
    const [isRevealReady, setIsRevealReady] = useState(reveal === "none");

    useEffect(() => {
        // Every setState below is deferred to at least one frame — never
        // called synchronously in the effect body — since that's the
        // cascading-render pattern React now flags as a lint error.
        const pendingFrames: number[] = [];
        const onFrame = (fn: () => void) => {
            pendingFrames.push(requestAnimationFrame(fn));
        };

        if (reveal === "none") {
            onFrame(() => setIsRevealReady(true));
        } else {
            onFrame(() => setIsRevealReady(false));

            if (revealed) {
                onFrame(() => onFrame(() => setIsRevealReady(true)));
            }
        }

        return () => pendingFrames.forEach((id) => cancelAnimationFrame(id));
    }, [reveal, revealed]);

    const mergedStyle = {
        ...((style as CSSProperties | undefined) ?? {}),
        "--glass-entry-delay": `${revealDelayMs}ms`,
    } as CSSProperties;

    return (
        <Tag
            data-tone={tone}
            data-intensity={intensity}
            data-interactive={interactive}
            data-preset={preset}
            data-glass-state={state}
            data-reveal={reveal}
            data-reveal-state={isRevealReady ? "visible" : "hidden"}
            className={cn(styles.root, className)}
            style={mergedStyle}
            {...props}
        >
            <span className={styles.depth} aria-hidden="true" />
            <span className={styles.lens} aria-hidden="true" />
            <span className={styles.caustic} aria-hidden="true" />
            <span className={styles.sheen} aria-hidden="true" />
            <span className={styles.prism} aria-hidden="true" />
            <span className={styles.noise} aria-hidden="true" />
            <div className={cn(styles.content, contentClassName)}>{children}</div>
        </Tag>
    );
}

GlassSurface.displayName = "GlassSurface";
