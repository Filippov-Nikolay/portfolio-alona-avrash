import { Fragment, type ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/shared/ui/Breadcrumbs";
import type { BreadcrumbItem } from "@/shared/ui/Breadcrumbs";
import {
    parseLegalMarkdown,
    type LegalInline,
    type LegalNode,
} from "@/content/legal/parseLegalMarkdown";
import { LEGAL_DOC_TITLES, LEGAL_ROUTES, type LegalDocSlug } from "@/content/legal/legalLinks";
import { LegalToc } from "./LegalToc";
import styles from "./LegalDocument.module.scss";

interface LegalDocumentProps {
    homeLabel: string;
    title: string;
    lastUpdatedLabel: string;
    lastUpdated: string;
    tocLabel: string;
    markdown: string;
    selfSlug: LegalDocSlug;
    afterHeader?: ReactNode;
}

const URL_OR_EMAIL_PATTERN =
    /(https?:\/\/[^\s)]+[^\s).,;:]|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;

function renderAutolinkedText(text: string, key: string): ReactNode[] {
    const segments = text.split(URL_OR_EMAIL_PATTERN);
    return segments
        .filter((segment) => segment.length > 0)
        .map((segment, index) => {
            if (/^https?:\/\//.test(segment)) {
                return (
                    <a
                        key={`${key}-url-${index}`}
                        href={segment}
                        target="_blank"
                        rel="noreferrer noopener"
                    >
                        {segment}
                    </a>
                );
            }
            if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(segment)) {
                return (
                    <a key={`${key}-mail-${index}`} href={`mailto:${segment}`}>
                        {segment}
                    </a>
                );
            }
            return <Fragment key={`${key}-txt-${index}`}>{segment}</Fragment>;
        });
}

function renderTextWithLegalLinks(text: string, selfSlug: LegalDocSlug, key: string): ReactNode[] {
    const otherDocs = (Object.keys(LEGAL_DOC_TITLES) as LegalDocSlug[]).filter(
        (slug) => slug !== selfSlug
    );
    if (otherDocs.length === 0) return renderAutolinkedText(text, key);

    const pattern = new RegExp(
        `(${otherDocs.map((slug) => LEGAL_DOC_TITLES[slug].replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})`,
        "g"
    );
    const segments = text.split(pattern);

    return segments
        .filter((segment) => segment.length > 0)
        .flatMap((segment, index) => {
            const matchedSlug = otherDocs.find((slug) => LEGAL_DOC_TITLES[slug] === segment);
            if (matchedSlug) {
                return (
                    <Link
                        key={`${key}-link-${index}`}
                        href={LEGAL_ROUTES[matchedSlug]}
                        className={styles.inlineLink}
                    >
                        {segment}
                    </Link>
                );
            }
            return renderAutolinkedText(segment, `${key}-${index}`);
        });
}

function renderInline(inline: LegalInline[], selfSlug: LegalDocSlug, keyPrefix: string): ReactNode {
    return inline.map((token, index) => {
        const key = `${keyPrefix}-${index}`;
        if (token.kind === "code") {
            return <code key={key}>{token.value}</code>;
        }
        return (
            <Fragment key={key}>{renderTextWithLegalLinks(token.value, selfSlug, key)}</Fragment>
        );
    });
}

function renderNode(node: LegalNode, selfSlug: LegalDocSlug, key: string): ReactNode {
    switch (node.type) {
        case "heading": {
            const HeadingTag = node.level === 2 ? "h2" : "h3";
            return (
                <HeadingTag
                    key={key}
                    id={node.id}
                    className={node.level === 2 ? styles.h2 : styles.h3}
                >
                    {renderInline(node.inline, selfSlug, key)}
                </HeadingTag>
            );
        }

        case "p":
            return (
                <p key={key} className={styles.paragraph}>
                    {renderInline(node.inline, selfSlug, key)}
                </p>
            );

        case "ul":
        case "ol": {
            const ListTag = node.type;
            return (
                <ListTag key={key} className={styles.list}>
                    {node.items.map((item, itemIndex) => (
                        <li key={`${key}-${itemIndex}`}>
                            {renderInline(item, selfSlug, `${key}-${itemIndex}`)}
                        </li>
                    ))}
                </ListTag>
            );
        }

        case "table":
            return (
                <div key={key} className={styles.tableWrap}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                {node.header.map((cell, cellIndex) => (
                                    <th key={cellIndex}>{cell}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {node.rows.map((row, rowIndex) => (
                                <tr key={rowIndex}>
                                    {row.map((cell, cellIndex) => (
                                        <td key={cellIndex}>{cell}</td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            );
    }
}

function renderNodes(nodes: LegalNode[], selfSlug: LegalDocSlug, keyPrefix: string): ReactNode {
    return nodes.map((node, index) => renderNode(node, selfSlug, `${keyPrefix}-${index}`));
}

export function LegalDocument({
    homeLabel,
    title,
    lastUpdatedLabel,
    lastUpdated,
    tocLabel,
    markdown,
    selfSlug,
    afterHeader,
}: LegalDocumentProps) {
    const parsed = parseLegalMarkdown(markdown);
    const tocSections = parsed.sections.filter((section) => section.level === 2);
    const breadcrumbItems: BreadcrumbItem[] = [{ label: homeLabel, href: "/" }, { label: title }];

    return (
        <div className={styles.wrapper}>
            <div className={styles.breadcrumbBar}>
                <Breadcrumbs items={breadcrumbItems} />
            </div>

            <header className={styles.header}>
                <h1 className={styles.title}>{title}</h1>
                <p className={styles.lastUpdated}>
                    {lastUpdatedLabel} {lastUpdated}
                </p>
            </header>

            {afterHeader}

            <div className={styles.layout}>
                {tocSections.length > 0 && (
                    <LegalToc
                        tocLabel={tocLabel}
                        sections={tocSections.map((section) => ({
                            id: section.id,
                            title: section.title,
                        }))}
                    />
                )}

                <div className={styles.content}>
                    {renderNodes(parsed.intro, selfSlug, "intro")}
                    {parsed.sections.map((section) => (
                        <section key={section.id} className={styles.section}>
                            {renderNodes(
                                [
                                    {
                                        type: "heading",
                                        level: section.level,
                                        id: section.id,
                                        inline: section.titleInline,
                                    },
                                    ...section.nodes,
                                ],
                                selfSlug,
                                section.id
                            )}
                        </section>
                    ))}
                </div>
            </div>
        </div>
    );
}

LegalDocument.displayName = "LegalDocument";
