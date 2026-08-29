import { cn } from "@/shared/lib/cn";
import styles from "./Title.module.scss";

type TitleLevel = 1 | 2 | 3 | 4;
type TitleSize = "xl" | "lg" | "md" | "sm";

interface TitleProps {
    level?: TitleLevel;
    size?: TitleSize;
    children: React.ReactNode;
    className?: string;
}

const sizeMap: Record<TitleLevel, TitleSize> = {
    1: "xl",
    2: "lg",
    3: "md",
    4: "sm",
};

export function Title({ level = 2, size, children, className }: TitleProps) {
    const Tag = `h${level}` as const;
    const resolvedSize = size ?? sizeMap[level];

    return <Tag className={cn(styles.title, styles[resolvedSize], className)}>{children}</Tag>;
}
