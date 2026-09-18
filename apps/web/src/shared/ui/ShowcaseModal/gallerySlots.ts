import type { ShowcaseGalleryImage } from "@/shared/types";

export interface GallerySlotImage {
    image: ShowcaseGalleryImage;
    // Index into the original flat `images` array this slot was built
    // from - callers (ShowcaseModal) key background grid tiles by this,
    // so it has to survive the images-to-slots grouping.
    originalIndex: number;
}

export type GallerySlot =
    | { type: "single"; images: [GallerySlotImage] }
    | { type: "row"; images: [GallerySlotImage, GallerySlotImage] }
    | { type: "stack"; images: [GallerySlotImage, GallerySlotImage] };

// Groups images into lightbox slots, following each image's own pairMode
// flag (set by the CMS/content editor - see ProjectImage): an image with
// pairMode "row" or "stack" pairs with the very next image into one slot
// of that type; everything else gets its own "single" slot. Order is
// preserved throughout - pairing only ever looks at the *next* image,
// never reorders. A pairMode with no next image left to pair with is
// treated as unset.
export function computeGallerySlots(images: ShowcaseGalleryImage[]): GallerySlot[] {
    const slots: GallerySlot[] = [];
    let i = 0;

    while (i < images.length) {
        const current: GallerySlotImage = { image: images[i], originalIndex: i };
        const next = images[i + 1];
        const pairMode = next ? current.image.pairMode : undefined;

        if (pairMode) {
            const nextSlotImage: GallerySlotImage = { image: next, originalIndex: i + 1 };
            slots.push({ type: pairMode, images: [current, nextSlotImage] });
            i += 2;
        } else {
            slots.push({ type: "single", images: [current] });
            i += 1;
        }
    }

    return slots;
}
