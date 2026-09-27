export type LegalInline =
    | { kind: "text"; value: string }
    | { kind: "strong"; value: string }
    | { kind: "code"; value: string }
    | { kind: "break" };

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
    header: LegalInline[][];
    rows: LegalInline[][][];
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

function parseEmphasis(text: string): LegalInline[] {
    return text
        .split(/(\*\*[^*]+?\*\*)/g)
        .filter((part) => part.length > 0)
        .map((part) =>
            part.length > 4 && part.startsWith("**") && part.endsWith("**")
                ? { kind: "strong", value: part.slice(2, -2) }
                : { kind: "text", value: part }
        );
}

export function parseInline(text: string): LegalInline[] {
    return text
        .split(/(`[^`]+`)/g)
        .filter((part) => part.length > 0)
        .flatMap((part): LegalInline[] =>
            part.startsWith("`") && part.endsWith("`") && part.length > 1
                ? [{ kind: "code", value: part.slice(1, -1) }]
                : parseEmphasis(part)
        );
}

function headingPlainText(inline: LegalInline[]): string {
    return inline.map((part) => (part.kind === "break" ? " " : part.value)).join("");
}

export function parseLegalMarkdown(markdown: string): ParsedLegalDocument {
    const lines = markdown.split("\n");
    const intro: LegalNode[] = [];
    const sections: LegalSection[] = [];
    const usedIds = new Set<string>();

    let currentNodes: LegalNode[] = intro;
    let paragraphBuffer: { text: string; hardBreak: boolean }[] = [];
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
        const segments: string[][] = [[]];
        paragraphBuffer.forEach(({ text, hardBreak }, index) => {
            segments.at(-1)!.push(text);
            if (hardBreak && index < paragraphBuffer.length - 1) segments.push([]);
        });
        currentNodes.push({
            type: "p",
            inline: segments.flatMap((segment, index): LegalInline[] => [
                ...(index > 0 ? [{ kind: "break" as const }] : []),
                ...parseInline(segment.join(" ")),
            ]),
        });
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
        currentNodes.push({
            type: "table",
            header: tableBuffer.header.map(parseInline),
            rows: tableBuffer.rows.map((row) => row.map(parseInline)),
        });
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

        if (/^#\s/.test(trimmed)) {
            flushAll();
            continue;
        }

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
        const backslashBreak = trimmed.endsWith("\\");
        paragraphBuffer.push({
            text: backslashBreak ? trimmed.slice(0, -1).trimEnd() : trimmed,
            hardBreak: backslashBreak || / {2,}\r?$/.test(rawLine),
        });
    }

    flushAll();

    return { intro, sections };
}
