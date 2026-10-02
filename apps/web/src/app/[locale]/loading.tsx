import styles from "@/widgets/Preloader/Preloader.module.scss";
import { siteConfig } from "@/shared/config/site.config";

const nameParts = siteConfig.name.split(" ").filter(Boolean);
const FIRST_NAME = nameParts[0] ?? siteConfig.name;
const LAST_NAME = nameParts.at(-1) ?? siteConfig.name;

export default function LoadingPage() {
    return (
        <div
            className={`${styles.overlay} ${styles.routeOverlay}`}
            role="status"
            aria-label={`Loading ${siteConfig.name}'s portfolio`}
        >
            <div className={styles.quickLoader} aria-hidden="true">
                <div className={styles.quickBrand}>
                    <span className={styles.quickFirstName}>{FIRST_NAME}</span>
                    <span className={styles.quickLastName}>{LAST_NAME}</span>
                </div>
                <div className={styles.quickTrack}>
                    <span className={styles.quickProgress} />
                </div>
            </div>
            <span className={styles.srOnly}>Loading {siteConfig.name}&apos;s portfolio</span>
        </div>
    );
}
