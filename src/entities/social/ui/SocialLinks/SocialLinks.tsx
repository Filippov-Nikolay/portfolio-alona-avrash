"use client";

import type { CSSProperties } from "react";
import type { Social } from "../../model/social";
import { cn } from "@/shared/lib/cn";
import styles from "./SocialLinks.module.scss";

interface SocialLinksProps {
    socials: Social[];
    ariaLabel: string;
    variant?: "default" | "accent";
    animateItems?: boolean;
    className?: string;
}

export function SocialLinks({
    socials,
    ariaLabel,
    variant = "default",
    animateItems = false,
    className,
}: SocialLinksProps) {
    return (
        <ul
            className={cn(styles.list, variant === "accent" && styles.accent, className)}
            aria-label={ariaLabel}
        >
            {socials.map((social) => (
                <li key={social.id} data-footer-social-item={animateItems || undefined}>
                    <a
                        href={social.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label={social.logo.alt ?? social.id}
                        className={styles.link}
                        style={{ "--social-icon": `url(${social.logo.src})` } as CSSProperties}
                    >
                        <span className={styles.icon} aria-hidden="true" />
                    </a>
                </li>
            ))}
        </ul>
    );
}
