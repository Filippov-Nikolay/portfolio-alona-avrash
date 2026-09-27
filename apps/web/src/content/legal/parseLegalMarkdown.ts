export type LegalInline = { kind: "text"; value: string } | { kind: "code"; value: string };

export interface LegalHeadingNode {
    type: "heading";
    level: 2 | 3;
    id: string;
    inline: LegalInline[];
}

export interface LegalParagraphNode {
    type: "p";
    inline: LegalInline[];
}

export interface LegalListNode {
    type: "ul" | "ol";
    items: LegalInline[][];
}

export interface LegalTableNode {
    type: "table";
    header: string[];
    rows: string[][];
}

export type LegalNode = LegalHeadingNode | LegalParagraphNode | LegalListNode | LegalTableNode;

export interface LegalSection {
    id: string;
    level: 2 | 3;
    title: string;
    titleInline: LegalInline[];
    nodes: LegalNode[];
}

export interface ParsedLegalDocument {
    intro: LegalNode[];
    sections: LegalSection[];
}

function slugify(text: string): string {
    return text
        .toLowerCase()
        .replace(/[`"'.,/()]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function parseInline(text: string): LegalInline[] {
    const parts = text.split(/(`[^`]+`)/g).filter((part) => part.length > 0);
    return parts.map((part) => {
        if (part.startsWith("`") && part.endsWith("`") && part.length > 1) {
            return { kind: "code", value: part.slice(1, -1) };
        }
        return { kind: "text", value: part };
    });
}

function headingPlainText(inline: LegalInline[]): string {
    return inline.map((part) => part.value).join("");
}

export function parseLegalMarkdown(markdown: string): ParsedLegalDocument {
    const lines = markdown.split("\n");
    const intro: LegalNode[] = [];
    const sections: LegalSection[] = [];
    const usedIds = new Set<string>();

    let currentNodes: LegalNode[] = intro;
    let paragraphBuffer: string[] = [];
    let listBuffer: { type: "ul" | "ol"; items: string[] } | null = null;
    let tableBuffer: { header: string[]; rows: string[][] } | null = null;

    function uniqueId(base: string): string {
        let id = base || "section";
        let counter = 2;
        while (usedIds.has(id)) {
            id = `${base}-${counter}`;
            counter += 1;
        }
        usedIds.add(id);
        return id;
    }

    function flushParagraph() {
        if (paragraphBuffer.length === 0) return;
        currentNodes.push({ type: "p", inline: parseInline(paragraphBuffer.join(" ")) });
        paragraphBuffer = [];
    }

    function flushList() {
        if (!listBuffer) return;
        currentNodes.push({
            type: listBuffer.type,
            items: listBuffer.items.map((item) => parseInline(item)),
        });
        listBuffer = null;
    }

    function flushTable() {
        if (!tableBuffer) return;
        currentNodes.push({ type: "table", header: tableBuffer.header, rows: tableBuffer.rows });
        tableBuffer = null;
    }

    function flushAll() {
        flushParagraph();
        flushList();
        flushTable();
    }

    function splitTableRow(line: string): string[] {
        return line
            .trim()
            .replace(/^\|/, "")
            .replace(/\|$/, "")
            .split("|")
            .map((cell) => cell.trim());
    }

    for (const rawLine of lines) {
        const line = rawLine.trimEnd();
        const trimmed = line.trim();

        const headingMatch = /^(##|###)\s+(.*)$/.exec(trimmed);
        if (headingMatch) {
            flushAll();
            const level = headingMatch[1].length === 2 ? 2 : 3;
            const inline = parseInline(headingMatch[2].trim());
            const id = uniqueId(slugify(headingPlainText(inline)));
            sections.push({
                id,
                level,
                title: headingPlainText(inline),
                titleInline: inline,
                nodes: [],
            });
            currentNodes = sections[sections.length - 1].nodes;
            continue;
        }

        if (trimmed === "---") {
            flushAll();
            continue;
        }

        if (trimmed === "") {
            flushAll();
            continue;
        }

        if (trimmed.startsWith("|")) {
            flushParagraph();
            flushList();
            const cells = splitTableRow(trimmed);
            const isSeparatorRow = cells.every((cell) => /^:?-+:?$/.test(cell));
            if (isSeparatorRow) continue;

            if (!tableBuffer) {
                tableBuffer = { header: cells, rows: [] };
            } else {
                tableBuffer.rows.push(cells);
            }
            continue;
        }
        flushTable();

        const bulletMatch = /^-\s+(.*)$/.exec(trimmed);
        const orderedMatch = /^\d+\.\s+(.*)$/.exec(trimmed);

        if (bulletMatch) {
            flushParagraph();
            if (!listBuffer || listBuffer.type !== "ul") {
                flushList();
                listBuffer = { type: "ul", items: [] };
            }
            listBuffer.items.push(bulletMatch[1]);
            continue;
        }

        if (orderedMatch) {
            flushParagraph();
            if (!listBuffer || listBuffer.type !== "ol") {
                flushList();
                listBuffer = { type: "ol", items: [] };
            }
            listBuffer.items.push(orderedMatch[1]);
            continue;
        }

        flushList();
        paragraphBuffer.push(trimmed);
    }

    flushAll();

    return { intro, sections };
}
