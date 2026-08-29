import type { ButtonHTMLAttributes, AnchorHTMLAttributes, ReactNode } from "react";

export type ButtonVariant = "second" | "primary" | "ghost" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

type BaseProps = {
    variant?: ButtonVariant;
    size?: ButtonSize;
    isLoading?: boolean;
    leftIcon?: ReactNode;
    rightIcon?: ReactNode;
    children: ReactNode;
    className?: string;
};

// Если as="a" - принимает href, target и т.д.
// Если as="button" (дефолт) - принимает onClick, disabled и т.д.
export type ButtonProps =
    | (BaseProps & { as?: "button" } & ButtonHTMLAttributes<HTMLButtonElement>)
    | (BaseProps & { as: "a" } & AnchorHTMLAttributes<HTMLAnchorElement>);
