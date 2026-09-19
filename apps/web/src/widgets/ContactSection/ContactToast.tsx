"use client";

import { m, AnimatePresence } from "framer-motion";
import styles from "./ContactToast.module.scss";

export type ContactToastStatus = "success" | "error";

interface ContactToastProps {
    status: ContactToastStatus | null;
    message: string;
    onDismiss: () => void;
}

function CheckIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

function AlertIcon() {
    return (
        <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v5" />
            <path d="M12 16h.01" />
        </svg>
    );
}

function DismissIcon() {
    return (
        <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
        </svg>
    );
}

export function ContactToast({ status, message, onDismiss }: ContactToastProps) {
    return (
        <div className={styles.region}>
            <AnimatePresence>
                {status && (
                    <m.div
                        key={status}
                        className={`${styles.toast} ${status === "error" ? styles.toastError : styles.toastSuccess}`}
                        role="status"
                        aria-live="polite"
                        initial={{ opacity: 0, y: -16, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -16, scale: 0.96 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <span className={styles.icon} aria-hidden="true">
                            {status === "error" ? <AlertIcon /> : <CheckIcon />}
                        </span>
                        <p className={styles.message}>{message}</p>
                        <button
                            type="button"
                            className={styles.close}
                            onClick={onDismiss}
                            aria-label="Dismiss"
                        >
                            <DismissIcon />
                        </button>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
