import type { ReactNode } from "react";
import styles from "./AnalyticsNotice.module.css";

interface AnalyticsNoticeProps {
    children: ReactNode;
}

export function AnalyticsNotice({ children }: AnalyticsNoticeProps) {
    return (
        <div className={styles.notice}>
            <p>{children}</p>
        </div>
    );
}
