export interface ToolBadgeData {
    id: string;
    icon: string;
    title: string;
    description: string;
}

export const TOOL_BADGES: ToolBadgeData[] = [
    {
        id: "figma",
        icon: "/assets/tools/v1/ICON-FIGMA.svg",
        title: "Figma",
        description: "UI/UX Design",
    },
    {
        id: "illustrator",
        icon: "/assets/tools/v1/ICON-ILLUSTRATOR.svg",
        title: "Illustrator",
        description: "Vector Design",
    },
    {
        id: "photoshop",
        icon: "/assets/tools/v1/ICON-PHOTOSHOP.svg",
        title: "Photoshop",
        description: "Image Editing",
    },
    {
        id: "after-effects",
        icon: "/assets/tools/v1/ICON-AFTER-EFFECTS.svg",
        title: "After Effects",
        description: "Motion Design",
    },
    {
        id: "indesign",
        icon: "/assets/tools/v1/ICON-INDESIGN.svg",
        title: "InDesign",
        description: "Editorial Design",
    },
];

const TOOL_BADGES_BY_ID = new Map(TOOL_BADGES.map((badge) => [badge.id, badge]));

export function getToolBadge(id: string): ToolBadgeData | undefined {
    return TOOL_BADGES_BY_ID.get(id);
}
