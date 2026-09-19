import Link from "next/link";
import styles from "./PageHeader.module.css";

interface PageHeaderProps {
    title: string;
    backHref?: string;
    backLabel?: string;
}

export function PageHeader({ title, backHref, backLabel = "Back" }: PageHeaderProps) {
    return (
        <div className={styles.header}>
            {backHref && (
                <Link href={backHref} className={styles.back}>
                    &larr; {backLabel}
                </Link>
            )}
            <h1 className={styles.title}>{title}</h1>
        </div>
    );
}
