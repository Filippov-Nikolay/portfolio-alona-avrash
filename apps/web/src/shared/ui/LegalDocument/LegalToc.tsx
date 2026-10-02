"use client";

import { useEffect, useRef } from "react";
import { useActiveSection } from "@/shared/hooks";
import { cn } from "@/shared/lib/cn";
import styles from "./LegalDocument.module.scss";

interface LegalTocEntry {
    id: string;
    title: string;
}

interface LegalTocProps {
    tocLabel: string;
    sections: LegalTocEntry[];
}

export function LegalToc({ tocLabel, sections }: LegalTocProps) {
    const ids = sections.map((section) => section.id);
    const activeId = useActiveSection(ids, true);
    const activeLinkRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        activeLinkRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }, [activeId]);

    return (
        <details className={styles.toc} open>
            <summary className={styles.tocSummary}>{tocLabel}</summary>
            <ul className={styles.tocList}>
                {sections.map((section) => {
                    const isActive = section.id === activeId;
                    return (
                        <li key={section.id}>
                            <a
                                href={`#${section.id}`}
                                ref={isActive ? activeLinkRef : undefined}
                                className={cn(styles.tocLink, isActive && styles.tocLinkActive)}
                                aria-current={isActive ? "location" : undefined}
                            >
                                <span>{section.title}</span>
                                <span className={styles.tocDot} aria-hidden="true" />
                            </a>
                        </li>
                    );
                })}
            </ul>
        </details>
    );
}

LegalToc.displayName = "LegalToc";
