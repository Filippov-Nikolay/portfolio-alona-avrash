import { describe, expect, it } from "vitest";
import { parseInline, parseLegalMarkdown } from "./parseLegalMarkdown";

describe("parseInline", () => {
    it("turns **text** into a strong token without the markers", () => {
        expect(parseInline("**Necessary** — required storage")).toEqual([
            { kind: "strong", value: "Necessary" },
            { kind: "text", value: " — required storage" },
        ]);
    });

    it("handles several bold runs and code in one line", () => {
        expect(
            parseInline("Reject **Analytics** to clear `avrash_analytics_seen` and **more**.")
        ).toEqual([
            { kind: "text", value: "Reject " },
            { kind: "strong", value: "Analytics" },
            { kind: "text", value: " to clear " },
            { kind: "code", value: "avrash_analytics_seen" },
            { kind: "text", value: " and " },
            { kind: "strong", value: "more" },
            { kind: "text", value: "." },
        ]);
    });

    it("leaves asterisks inside code and unmatched markers untouched", () => {
        expect(parseInline("`**raw**` and ** alone")).toEqual([
            { kind: "code", value: "**raw**" },
            { kind: "text", value: " and ** alone" },
        ]);
    });
});

describe("parseLegalMarkdown", () => {
    it("parses bold inside list items and table cells", () => {
        const { sections } = parseLegalMarkdown(
            [
                "## 2. Categories",
                "- **Necessary** — always on;",
                "- **Analytics** — optional.",
                "",
                "| Name | Category |",
                "| --- | --- |",
                "| `NEXT_LOCALE` | **Necessary** |",
            ].join("\n")
        );
        const [list, table] = sections[0]!.nodes;

        expect(list).toEqual({
            type: "ul",
            items: [
                [
                    { kind: "strong", value: "Necessary" },
                    { kind: "text", value: " — always on;" },
                ],
                [
                    { kind: "strong", value: "Analytics" },
                    { kind: "text", value: " — optional." },
                ],
            ],
        });
        expect(table).toEqual({
            type: "table",
            header: [[{ kind: "text", value: "Name" }], [{ kind: "text", value: "Category" }]],
            rows: [
                [
                    [{ kind: "code", value: "NEXT_LOCALE" }],
                    [{ kind: "strong", value: "Necessary" }],
                ],
            ],
        });
    });

    it("breaks lines that end with two spaces or a backslash and joins soft-wrapped ones", () => {
        const { sections } = parseLegalMarkdown(
            [
                "## 1. Who operates the Website",
                "Website operator: Alona Avrash  ",
                "Website: avrash.com\\",
                "Contact: avrash.design@gmail.com",
                "wrapped on the next line",
            ].join("\n")
        );
        expect(sections[0]!.nodes).toEqual([
            {
                type: "p",
                inline: [
                    { kind: "text", value: "Website operator: Alona Avrash" },
                    { kind: "break" },
                    { kind: "text", value: "Website: avrash.com" },
                    { kind: "break" },
                    {
                        kind: "text",
                        value: "Contact: avrash.design@gmail.com wrapped on the next line",
                    },
                ],
            },
        ]);
    });

    it("drops the document-level # title, which the page renders itself", () => {
        const { intro, sections } = parseLegalMarkdown(
            ["# Cookie & Browser Storage Policy", "", "Intro text.", "", "## 1. First"].join("\n")
        );
        expect(intro).toEqual([{ type: "p", inline: [{ kind: "text", value: "Intro text." }] }]);
        expect(sections.map((section) => section.title)).toEqual(["1. First"]);
    });

    it("keeps bold markers out of heading ids and table-of-contents titles", () => {
        const { sections } = parseLegalMarkdown("## **Summary** table");
        expect(sections[0]).toMatchObject({ id: "summary-table", title: "Summary table" });
    });
});
