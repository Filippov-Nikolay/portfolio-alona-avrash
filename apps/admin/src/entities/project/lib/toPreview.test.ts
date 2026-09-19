import { describe, expect, it } from "vitest";
import type { CategoryOption, ToolBadgeOption } from "@avrash/content-schema";
import type { ProjectInput } from "@/entities/project/api/projectsRepository";
import { toPreviewProject, toPreviewShowcaseItem } from "./toPreview";

const CATEGORIES: CategoryOption[] = [
    { key: "branding", label: "Branding" },
    { key: "packaging", label: "Packaging" },
];

const TOOLS: ToolBadgeOption[] = [{ key: "custom-tool", label: "Custom Tool" }];

function makeInput(overrides: Partial<ProjectInput> = {}): ProjectInput {
    return {
        image: [],
        createdAt: "2024-01-01T00:00:00.000Z",
        name: "Cafe Rebrand",
        categories: ["branding"],
        hover: {
            background: "#111111",
            accentColor: "#ffffff",
            buttonBackground: "#222222",
            buttonTextColor: "#ffffff",
        },
        ...overrides,
    };
}

describe("toPreviewProject", () => {
    it("uses a stable negative id that can never collide with a real project", () => {
        expect(toPreviewProject(makeInput()).id).toBe(-1);
    });

    it("resolves every image src against the asset base URL", () => {
        const project = toPreviewProject(
            makeInput({
                image: [{ id: 1, order: 0, src: "/projects/uploads/a.webp" }],
            })
        );
        expect(project.image[0]!.src).toBe("http://localhost:3000/projects/uploads/a.webp");
    });

    it("leaves an already-absolute image src untouched", () => {
        const project = toPreviewProject(
            makeInput({
                image: [{ id: 1, order: 0, src: "https://cdn.example.com/a.webp" }],
            })
        );
        expect(project.image[0]!.src).toBe("https://cdn.example.com/a.webp");
    });
});

describe("toPreviewShowcaseItem", () => {
    it("slugifies the project name", () => {
        const item = toPreviewShowcaseItem(makeInput({ name: "Cafe & Co." }), CATEGORIES, TOOLS);
        expect(item.slug).toBe("cafe-co");
    });

    it("joins category labels looked up from categoryOptions", () => {
        const item = toPreviewShowcaseItem(
            makeInput({ categories: ["branding", "packaging"] }),
            CATEGORIES,
            TOOLS
        );
        expect(item.category).toBe("Branding · Packaging");
    });

    it("falls back to the raw key for a category with no matching option", () => {
        const item = toPreviewShowcaseItem(
            makeInput({ categories: ["unknown-key"] }),
            CATEGORIES,
            TOOLS
        );
        expect(item.category).toBe("unknown-key");
    });

    it("picks the image marked isHero as the card src, resolved to an absolute URL", () => {
        const item = toPreviewShowcaseItem(
            makeInput({
                image: [
                    { id: 1, order: 0, src: "/a.webp" },
                    { id: 2, order: 1, src: "/b.webp", isHero: true },
                ],
            }),
            CATEGORIES,
            TOOLS
        );
        expect(item.src).toBe("http://localhost:3000/b.webp");
    });

    it("falls back to the first image when none is marked isHero", () => {
        const item = toPreviewShowcaseItem(
            makeInput({
                image: [
                    { id: 1, order: 0, src: "/first.webp" },
                    { id: 2, order: 1, src: "/second.webp" },
                ],
            }),
            CATEGORIES,
            TOOLS
        );
        expect(item.src).toBe("http://localhost:3000/first.webp");
    });

    it("builds the gallery from every non-hero image, sorted by order", () => {
        const item = toPreviewShowcaseItem(
            makeInput({
                image: [
                    { id: 1, order: 2, src: "/c.webp" },
                    { id: 2, order: 0, src: "/a.webp", isHero: true },
                    { id: 3, order: 1, src: "/b.webp" },
                ],
            }),
            CATEGORIES,
            TOOLS
        );
        expect(item.gallery.map((image) => image.src)).toEqual([
            "http://localhost:3000/b.webp",
            "http://localhost:3000/c.webp",
        ]);
    });

    it("uses the project name as alt text when an image has none", () => {
        const item = toPreviewShowcaseItem(
            makeInput({
                name: "Cafe Rebrand",
                image: [{ id: 1, order: 0, src: "/a.webp" }],
            }),
            CATEGORIES,
            TOOLS
        );
        expect(item.gallery[0]!.alt).toBe("Cafe Rebrand");
    });

    it("is featured exactly when selectedWork is set", () => {
        const withoutRank = toPreviewShowcaseItem(makeInput(), CATEGORIES, TOOLS);
        const withRank = toPreviewShowcaseItem(
            makeInput({ selectedWork: { rank: 1 } }),
            CATEGORIES,
            TOOLS
        );
        expect(withoutRank.featured).toBe(false);
        expect(withRank.featured).toBe(true);
    });

    it("resolves a built-in tool badge by id", () => {
        const item = toPreviewShowcaseItem(makeInput({ tools: ["figma"] }), CATEGORIES, TOOLS);
        expect(item.tools).toEqual([
            {
                id: "figma",
                icon: "http://localhost:3000/assets/tools/v1/ICON-FIGMA.svg",
                title: "Figma",
                description: "UI/UX Design",
            },
        ]);
    });

    it("falls back to the admin-defined catalog for a non-built-in tool", () => {
        const item = toPreviewShowcaseItem(
            makeInput({ tools: ["custom-tool"] }),
            CATEGORIES,
            TOOLS
        );
        expect(item.tools).toEqual([
            {
                id: "custom-tool",
                icon: "http://localhost:3000/assets/tools/generic.svg",
                title: "Custom Tool",
                description: "",
            },
        ]);
    });

    it("drops a tool key that matches neither built-ins nor the catalog", () => {
        const item = toPreviewShowcaseItem(makeInput({ tools: ["ghost"] }), CATEGORIES, TOOLS);
        expect(item.tools).toEqual([]);
    });

    it("leaves tools undefined when the project has none", () => {
        const item = toPreviewShowcaseItem(makeInput(), CATEGORIES, TOOLS);
        expect(item.tools).toBeUndefined();
    });

    it("falls back to hover.background when accentColorModal is unset", () => {
        const item = toPreviewShowcaseItem(
            makeInput({ hover: { ...makeInput().hover, background: "#abcdef" } }),
            CATEGORIES,
            TOOLS
        );
        expect(item.accentColorModal).toBe("#abcdef");
    });

    it("prefers an explicit accentColorModal over hover.background", () => {
        const item = toPreviewShowcaseItem(
            makeInput({ accentColorModal: "#123456" }),
            CATEGORIES,
            TOOLS
        );
        expect(item.accentColorModal).toBe("#123456");
    });
});
