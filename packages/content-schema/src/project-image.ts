import { z } from "zod";

export const ImageFocalPointSchema = z.object({
    x: z.number(),
    y: z.number(),
});
export type ImageFocalPoint = z.infer<typeof ImageFocalPointSchema>;

export const ProjectImageSchema = z.object({
    // Stable identity for this image within its project - assigned once and
    // never reused or reassigned, even if the image is later reordered or
    // other images around it are added/removed. Doubles as a React list key.
    id: z.number().int().nonnegative(),
    // Display position within the project's gallery. This is the field a
    // CMS editor changes to reorder images - consumers must sort by this,
    // never rely on the image's position in the array.
    order: z.number().int().nonnegative(),
    src: z.string().min(1),
    posterSrc: z.string().min(1).optional(),
    alt: z.string().optional(),
    // Pairs this image with the very next one (by order) in the gallery
    // lightbox: "row" places them side by side (for two portrait images),
    // "stack" places them one above the other (for two short/wide banners).
    // Leave unset for a normal full-bleed single-image slot. Only takes
    // effect on the first image of the pair - the second image's own
    // pairMode (if any) is ignored, since it was already consumed.
    pairMode: z.enum(["row", "stack"]).optional(),
    // True for the one image (per project) to use as the preview/hero
    // shot — in a card, a listing thumbnail, an OG image, etc. A project
    // with multiple images should have exactly one marked true.
    isHero: z.boolean().optional(),
    focalPoint: ImageFocalPointSchema.optional(),
    scale: z.number().optional(),
});
export type ProjectImage = z.infer<typeof ProjectImageSchema>;

export const ContentImageSchema = ProjectImageSchema.pick({
    src: true,
    alt: true,
    focalPoint: true,
    scale: true,
});
export type ContentImage = z.infer<typeof ContentImageSchema>;
