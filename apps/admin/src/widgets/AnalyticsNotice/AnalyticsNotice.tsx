import type { ReactNode } from "react";
import styles from "./AnalyticsNotice.module.css";

interface AnalyticsNoticeProps {
    children: ReactNode;
    title?: string;
}

export function AnalyticsNotice({
    children,
    title = "Analytics unavailable",
}: AnalyticsNoticeProps) {
    return (
        <div className={styles.notice}>
            <span className={styles.icon} aria-hidden="true">
                !
            </span>
            <div>
                <strong className={styles.title}>{title}</strong>
                <p>{children}</p>
            </div>
        </div>
    );
}
