import styles from "@/widgets/Preloader/Preloader.module.scss";
import { siteConfig, siteInitials } from "@/shared/config/site.config";

export default function LoadingPage() {
    return (
        <div className={styles.overlay}>
            <div className={styles.center}>
                <div className={styles.logo} aria-hidden="true">
                    {siteInitials}
                </div>
                <p className={styles.name}>{siteConfig.name}</p>
                <div className={styles.terminal} aria-label="Loading">
                    <span className={styles.termPrompt}>{">"}</span>
                    <span className={styles.termText}>loading</span>
                    <span className={styles.termCursor} aria-hidden="true">
                        _
                    </span>
                </div>
                <div className={styles.barTrack}>
                    <div className={`${styles.barFill} ${styles.barFillLoop}`} />
                </div>
            </div>
        </div>
    );
}
