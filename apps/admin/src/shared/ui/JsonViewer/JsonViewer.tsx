import styles from "./JsonViewer.module.css";

interface JsonViewerProps {
    data: unknown;
}

export function JsonViewer({ data }: JsonViewerProps) {
    if (data === undefined) {
        return (
            <p className={styles.empty}>No JSON file for this section - nothing to edit here.</p>
        );
    }

    return <pre className={styles.viewer}>{JSON.stringify(data, null, 2)}</pre>;
}
