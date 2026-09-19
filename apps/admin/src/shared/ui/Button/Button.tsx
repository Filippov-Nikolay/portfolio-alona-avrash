import { forwardRef } from "react";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes, Ref } from "react";
import Link from "next/link";
import { cn } from "@/shared/lib/cn";
import styles from "./Button.module.css";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

interface CommonProps {
    variant?: ButtonVariant;
    className?: string;
}

type ButtonAsButton = CommonProps &
    ButtonHTMLAttributes<HTMLButtonElement> & {
        href?: undefined;
    };

type ButtonAsLink = CommonProps &
    AnchorHTMLAttributes<HTMLAnchorElement> & {
        href: string;
    };

type ButtonProps = ButtonAsButton | ButtonAsLink;

export const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
    ({ variant = "secondary", className, href, ...props }, ref) => {
        const classes = cn(styles.button, styles[variant], className);

        if (href !== undefined) {
            return (
                <Link
                    ref={ref as Ref<HTMLAnchorElement>}
                    href={href}
                    className={classes}
                    {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)}
                />
            );
        }

        return (
            <button
                ref={ref as Ref<HTMLButtonElement>}
                type="button"
                className={classes}
                {...(props as ButtonHTMLAttributes<HTMLButtonElement>)}
            />
        );
    }
);

Button.displayName = "Button";
