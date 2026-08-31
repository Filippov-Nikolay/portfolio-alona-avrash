import { cn } from "@/shared/lib/cn";
import styles from "./Container.module.scss";

interface ContainerProps {
    children: React.ReactNode;
    className?: string;
}

export function Container({ children, className }: ContainerProps) {
    return <div className={cn(styles.container, className)}>{children}</div>;
}
