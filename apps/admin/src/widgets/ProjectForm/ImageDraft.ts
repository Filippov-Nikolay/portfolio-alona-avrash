import type { Project, ProjectImage } from "@avrash/content-schema";

export interface ImageDraft {
    id: number;
    src: string;
    alt: string;
    pairMode: "" | "row" | "stack";
    isHero: boolean;
}

export function toImageDrafts(images: Project["image"]): ImageDraft[] {
    return [...images]
        .sort((a, b) => a.order - b.order)
        .map((image) => ({
            id: image.id,
            src: image.src,
            alt: image.alt ?? "",
            pairMode: image.pairMode ?? "",
            isHero: image.isHero ?? false,
        }));
}

export function fromImageDrafts(drafts: ImageDraft[]): ProjectImage[] {
    return drafts.map((draft, index) => ({
        id: draft.id,
        order: index,
        src: draft.src.trim(),
        ...(draft.alt.trim() ? { alt: draft.alt.trim() } : {}),
        ...(draft.pairMode ? { pairMode: draft.pairMode } : {}),
        ...(draft.isHero ? { isHero: true } : {}),
    }));
}
