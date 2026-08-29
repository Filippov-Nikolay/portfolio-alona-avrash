"use client";

import { useEffect } from "react";
import Image from "next/image";
import { createPortal } from "react-dom";
import { m, AnimatePresence } from "framer-motion";
import type { ShowcaseItem } from "@/shared/types";
import { useMounted } from "@/shared/hooks/useMounted";
import { Tag, ArrowIcon } from "@/shared/ui";
import { ACCENT_COLORS } from "@/shared/constants/colors";
import styles from "./ShowcaseModal.module.scss";

function initials(title: string): string {
    return title
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
}

// == ModalContent =========================================

interface ModalContentProps {
    item: ShowcaseItem;
    onClose: () => void;
    viewLabel: string;
}

function ModalContent({ item, onClose, viewLabel }: ModalContentProps) {
    const color = ACCENT_COLORS[item.color ?? "purple"];
    const mono = initials(item.title);

    return (
        <m.div
            className={styles.modal}
            role="dialog"
            aria-modal="true"
            aria-label={item.title}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            style={
                {
                    "--c-hex": color.hex,
                    "--c-a08": color.a08,
                    "--c-a12": color.a12,
                    "--c-a14": color.a14,
                    "--c-a18": color.a18,
                    "--c-a22": color.a22,
                    "--c-a25": color.a25,
                } as React.CSSProperties
            }
        >
            <button className={styles.close} onClick={onClose} aria-label="Close" autoFocus>
                ×
            </button>

            {/* Inner scroll container — clipped by .modal's overflow:hidden + border-radius */}
            <div className={styles.body}>
                {/* Visual area */}
                <div className={styles.visual} aria-hidden="true">
                    <div className={styles.visualGlow} />
                    {item.src ? (
                        <Image
                            src={item.src}
                            alt=""
                            fill
                            className={styles.image}
                            sizes="(max-width: 768px) 100vw, 680px"
                            draggable={false}
                        />
                    ) : (
                        <>
                            <div className={styles.visualRing} />
                            <span className={styles.mono}>{mono}</span>
                        </>
                    )}
                    <div className={styles.grid} />
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {item.category && <div className={styles.badge}>{item.category}</div>}

                    <h2 className={styles.title}>{item.title}</h2>
                    {item.description && <p className={styles.description}>{item.description}</p>}

                    {item.highlights && item.highlights.length > 0 && (
                        <ul className={styles.highlights}>
                            {item.highlights.map((h, i) => (
                                <li key={i} className={styles.highlight}>
                                    {h}
                                </li>
                            ))}
                        </ul>
                    )}

                    {item.tags.length > 0 && (
                        <div className={styles.tags}>
                            {item.tags.map((tag) => (
                                <Tag key={tag} className={styles.tag}>
                                    {tag}
                                </Tag>
                            ))}
                        </div>
                    )}

                    {item.secondaryHref && (
                        <a
                            href={item.secondaryHref}
                            className={styles.repoBtn}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            {viewLabel}
                            <ArrowIcon className={styles.arrow} />
                        </a>
                    )}
                </div>
            </div>
        </m.div>
    );
}

// == ShowcaseModal ==========================================

interface ShowcaseModalProps {
    item: ShowcaseItem | null;
    onClose: () => void;
    viewLabel: string;
}

export function ShowcaseModal({ item, onClose, viewLabel }: ShowcaseModalProps) {
    const mounted = useMounted();

    // ESC to close
    useEffect(() => {
        if (!item) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === "Escape") onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [item, onClose]);

    // Prevent body scroll while open
    useEffect(() => {
        document.body.style.overflow = item ? "hidden" : "";
        return () => {
            document.body.style.overflow = "";
        };
    }, [item]);

    if (!mounted) return null;

    return createPortal(
        <AnimatePresence>
            {item && (
                <m.div
                    className={styles.overlay}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.22 }}
                    onClick={onClose}
                >
                    <ModalContent
                        key={item.id}
                        item={item}
                        onClose={onClose}
                        viewLabel={viewLabel}
                    />
                </m.div>
            )}
        </AnimatePresence>,
        document.body
    );
}
