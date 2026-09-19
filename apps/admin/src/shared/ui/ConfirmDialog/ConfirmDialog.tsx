"use client";

import { useEffect } from "react";
import { Button } from "@/shared/ui/Button";
import styles from "./ConfirmDialog.module.css";

interface ConfirmDialogProps {
    open: boolean;
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
    danger?: boolean;
    pending?: boolean;
    onConfirm: () => void;
    onCancel: () => void;
}

export function ConfirmDialog({
    open,
    title,
    message,
    confirmLabel,
    cancelLabel = "Cancel",
    danger = false,
    pending = false,
    onConfirm,
    onCancel,
}: ConfirmDialogProps) {
    useEffect(() => {
        if (!open) return;

        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === "Escape") onCancel();
        }
        document.addEventListener("keydown", handleKeyDown);
        return () => document.removeEventListener("keydown", handleKeyDown);
    }, [open, onCancel]);

    if (!open) return null;

    return (
        <div className={styles.backdrop} onClick={onCancel}>
            <div
                className={styles.dialog}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="confirm-dialog-title"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="confirm-dialog-title" className={styles.title}>
                    {title}
                </h2>
                <p className={styles.message}>{message}</p>
                <div className={styles.actions}>
                    <Button variant="ghost" onClick={onCancel} disabled={pending}>
                        {cancelLabel}
                    </Button>
                    <Button
                        variant={danger ? "danger" : "primary"}
                        onClick={onConfirm}
                        disabled={pending}
                    >
                        {pending ? "..." : confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
}
