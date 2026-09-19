"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMounted } from "@avrash/ui";
import type { BuildInfo as BuildInfoData } from "@/shared/config/buildInfo";
import styles from "./BuildInfo.module.css";

interface BuildInfoProps {
    data: BuildInfoData;
}

const ROWS: Array<{ label: string; value: keyof BuildInfoData; prefix?: string }> = [
    { label: "Admin", value: "adminVersion", prefix: "v" },
    { label: "Web", value: "webVersion", prefix: "v" },
    { label: "Commit", value: "commit" },
    { label: "Environment", value: "environment" },
    { label: "Storage", value: "storageLabel" },
    { label: "Content", value: "contentLabel" },
    { label: "Last deploy", value: "lastDeploy" },
];

interface PanelPosition {
    top: number;
    right: number;
}

export function BuildInfo({ data }: BuildInfoProps) {
    const mounted = useMounted();
    const [position, setPosition] = useState<PanelPosition | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const panelRef = useRef<HTMLDivElement>(null);
    const expanded = position !== null;

    function open() {
        const rect = buttonRef.current?.getBoundingClientRect();
        if (!rect) return;

        setPosition({
            top: rect.bottom + window.scrollY + 8,
            right: document.documentElement.clientWidth - (rect.right + window.scrollX),
        });
    }

    function close() {
        setPosition(null);
    }

    useEffect(() => {
        if (!expanded) return;

        function handlePointerDown(event: PointerEvent) {
            const target = event.target as Node;
            if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) return;
            close();
        }
        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === "Escape") close();
        }

        document.addEventListener("pointerdown", handlePointerDown);
        document.addEventListener("keydown", handleKeyDown);
        window.addEventListener("scroll", close, true);
        return () => {
            document.removeEventListener("pointerdown", handlePointerDown);
            document.removeEventListener("keydown", handleKeyDown);
            window.removeEventListener("scroll", close, true);
        };
    }, [expanded]);

    return (
        <div className={styles.wrap}>
            <button
                ref={buttonRef}
                type="button"
                className={styles.summary}
                onClick={() => (expanded ? close() : open())}
                aria-expanded={expanded}
                aria-label="System info"
            >
                <span className={styles.version}>CMS v{data.adminVersion}</span>
                <span className={styles.meta}>
                    {data.commit} &middot; {data.environment}
                </span>
            </button>

            {mounted &&
                position &&
                createPortal(
                    <div
                        ref={panelRef}
                        className={styles.panel}
                        role="dialog"
                        aria-label="System info"
                        style={{ top: position.top, right: position.right }}
                    >
                        <p className={styles.panelTitle}>System info</p>
                        <dl className={styles.rows}>
                            {ROWS.map((row) => (
                                <div key={row.label} className={styles.row}>
                                    <dt>{row.label}</dt>
                                    <dd>
                                        {row.prefix}
                                        {data[row.value]}
                                    </dd>
                                </div>
                            ))}
                        </dl>
                    </div>,
                    document.body
                )}
        </div>
    );
}
