import type { ReactNode } from "react";
import Link from "next/link";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
    title: string;
    description?: string;
    backHref?: string;
    backLabel?: string;
    actions?: ReactNode;
}

export function PageHeader({
    title,
    description,
    backHref,
    backLabel = "Back",
    actions,
}: PageHeaderProps) {
    return (
        <div className={styles.header}>
            {backHref && (
                <Link href={backHref} className={styles.back}>
                    &larr; {backLabel}
                </Link>
            )}
            <div className={styles.titleRow}>
                <div>
                    <h1 className={styles.title}>{title}</h1>
                    {description && <p className={styles.description}>{description}</p>}
                </div>
                {actions && <div className={styles.actions}>{actions}</div>}
            </div>
        </div>
    );
}
