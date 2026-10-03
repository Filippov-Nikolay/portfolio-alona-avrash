"use client";

import { useEffect, useMemo, useRef } from "react";
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
    const ids = useMemo(() => sections.map((section) => section.id), [sections]);
    const activeId = useActiveSection(ids, true);
    const tocRef = useRef<HTMLDetailsElement>(null);
    const activeLinkRef = useRef<HTMLAnchorElement>(null);

    useEffect(() => {
        const toc = tocRef.current;
        const link = activeLinkRef.current;
        if (!toc || !link || toc.scrollHeight <= toc.clientHeight) return;
        const tocRect = toc.getBoundingClientRect();
        const linkRect = link.getBoundingClientRect();
        const offset =
            linkRect.top < tocRect.top
                ? linkRect.top - tocRect.top
                : Math.max(0, linkRect.bottom - tocRect.bottom);
        if (offset !== 0) toc.scrollBy({ top: offset, behavior: "smooth" });
    }, [activeId]);

    return (
        <details ref={tocRef} className={styles.toc} open>
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
