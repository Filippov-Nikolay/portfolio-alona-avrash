import { Link } from "@/i18n/navigation";
import styles from "./Breadcrumbs.module.scss";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

interface BreadcrumbsProps {
    items: BreadcrumbItem[];
}

export function Breadcrumbs({ items }: BreadcrumbsProps) {
    return (
        <nav aria-label="Breadcrumb" className={styles.breadcrumbs}>
            <ol className={styles.list}>
                {items.map((item, index) => (
                    <li key={index} className={styles.item}>
                        {item.href ? (
                            <Link href={item.href} className={styles.link}>
                                {item.label}
                            </Link>
                        ) : (
                            <span className={styles.current} aria-current="page">
                                {item.label}
                            </span>
                        )}
                        {index < items.length - 1 && (
                            <span className={styles.separator} aria-hidden="true">
                                /
                            </span>
                        )}
                    </li>
                ))}
            </ol>
        </nav>
    );
}

Breadcrumbs.displayName = "Breadcrumbs";
