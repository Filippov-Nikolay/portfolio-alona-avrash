import type { ShowcaseGalleryImage } from "../../types/showcase";

export interface GallerySlotImage {
    image: ShowcaseGalleryImage;
    originalIndex: number;
}

export type GallerySlot =
    | { type: "single"; images: [GallerySlotImage] }
    | { type: "row"; images: [GallerySlotImage, GallerySlotImage] }
    | { type: "stack"; images: [GallerySlotImage, GallerySlotImage] };

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
