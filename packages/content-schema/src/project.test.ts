import { describe, expect, it } from "vitest";
import { ProjectSchema, ProjectInputSchema } from "./project";

function validProject() {
    return {
        id: 1,
        image: [{ id: 1, order: 0, src: "/a.webp", isHero: true }],
        createdAt: "2024-01-01T00:00:00.000Z",
        name: "Cafe Rebrand",
        categories: ["branding"],
        hover: {
            background: "#111111",
            accentColor: "#ffffff",
            buttonBackground: "#222222",
            buttonTextColor: "#ffffff",
        },
    };
}

describe("ProjectSchema", () => {
    it("accepts a minimal valid project", () => {
        expect(() => ProjectSchema.parse(validProject())).not.toThrow();
    });

    it("accepts every optional field when present", () => {
        const project = {
            ...validProject(),
            selectedWork: { rank: 1 },
            tools: ["figma"],
            websiteUrl: "https://example.com",
            accentColorModal: "#abcdef",
        };
        expect(() => ProjectSchema.parse(project)).not.toThrow();
    });

    it("rejects a missing required field", () => {
        const { name: _name, ...withoutName } = validProject();
        const result = ProjectSchema.safeParse(withoutName);
        expect(result.success).toBe(false);
    });

    it("rejects a negative id", () => {
        const result = ProjectSchema.safeParse({ ...validProject(), id: -1 });
        expect(result.success).toBe(false);
    });

    it("rejects a non-integer id", () => {
        const result = ProjectSchema.safeParse({ ...validProject(), id: 1.5 });
        expect(result.success).toBe(false);
    });

    it("rejects an empty name", () => {
        const result = ProjectSchema.safeParse({ ...validProject(), name: "" });
        expect(result.success).toBe(false);
    });

    it("rejects a hover block with a missing color", () => {
        const project = validProject();
        const result = ProjectSchema.safeParse({
            ...project,
            hover: { ...project.hover, background: undefined },
        });
        expect(result.success).toBe(false);
    });

    it("rejects an image with an invalid pairMode", () => {
        const project = validProject();
        const result = ProjectSchema.safeParse({
            ...project,
            image: [{ ...project.image[0], pairMode: "diagonal" }],
        });
        expect(result.success).toBe(false);
    });

    it("strips unknown fields instead of rejecting them", () => {
        const result = ProjectSchema.safeParse({ ...validProject(), unknownField: "surprise" });
        expect(result.success).toBe(true);
        expect(result.success && "unknownField" in result.data).toBe(false);
    });
});

describe("ProjectInputSchema", () => {
    it("accepts a project without an id", () => {
        const { id: _id, ...input } = validProject();
        expect(() => ProjectInputSchema.parse(input)).not.toThrow();
    });

    it("rejects an input missing required fields beyond just id", () => {
        const result = ProjectInputSchema.safeParse({ name: "Only a name" });
        expect(result.success).toBe(false);
    });
});
