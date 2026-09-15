const backdrops = new Map<string, string>();
const MAX_CACHED_BACKDROPS = 64;

export function getImageBackdrop(src: string) {
    return backdrops.get(src);
}

export function createImageBackdrop(src: string, image: HTMLImageElement) {
    const cached = getImageBackdrop(src);
    if (cached) return cached;
    if (!image.naturalWidth || !image.naturalHeight) return;

    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    if (!context) return;

    const scale = 64 / Math.max(image.naturalWidth, image.naturalHeight);
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));

    try {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const backdrop = canvas.toDataURL("image/webp", 0.6);
        if (backdrops.size >= MAX_CACHED_BACKDROPS) {
            const oldest = backdrops.keys().next().value;
            if (oldest !== undefined) backdrops.delete(oldest);
        }
        backdrops.set(src, backdrop);
        return backdrop;
    } catch {
        return;
    }
}
