"use client";

import { forwardRef } from "react";
import type { AnchorHTMLAttributes, ButtonHTMLAttributes, Ref } from "react";
import { cn } from "../../lib/cn";
import type { ButtonProps } from "./Button.types";
import styles from "./Button.module.scss";

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
    (
        {
            as = "button",
            variant = "primary",
            size = "md",
            isLoading = false,
            leftIcon,
            rightIcon,
            children,
            className,
            ...props
        },
        ref
    ) => {
        const commonClass = cn(
            styles.button,
            styles[variant],
            styles[size],
            isLoading && styles.loading,
            className
        );

        const content = (
            <>
                {leftIcon && <span className={styles.icon}>{leftIcon}</span>}
                <span>{children}</span>
                {rightIcon && <span className={styles.icon}>{rightIcon}</span>}
            </>
        );

        if (as === "a") {
            return (
                <a
                    ref={ref as Ref<HTMLAnchorElement>}
                    className={commonClass}
                    {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
                >
                    {content}
                </a>
            );
        }

        return (
            <button
                ref={ref as React.Ref<HTMLButtonElement>}
                className={commonClass}
                disabled={(props as ButtonHTMLAttributes<HTMLButtonElement>).disabled || isLoading}
                {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
            >
                {content}
            </button>
        );
    }
);

Button.displayName = "Button";
