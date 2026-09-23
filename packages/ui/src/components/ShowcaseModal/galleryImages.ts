import type { ShowcaseGalleryImage } from "../../types/showcase";

interface GalleryImage {
    element: HTMLImageElement;
    borrowed: boolean;
    decoded: boolean;
    poster?: string;
}

// React owns empty hosts; the pool owns their image children. The very same
// decoded <img> travels from its tile to the lightbox and back.
export class GalleryImages {
    private entries = new Map<number, GalleryImage>();
    private homes = new Map<number, HTMLElement>();
    private frozen = false;
    private anchor = -1;

    constructor(private images: ShowcaseGalleryImage[]) {}

    get(index: number) {
        let entry = this.entries.get(index);
        if (!entry) {
            const source = this.images[index];
            const element = new Image();
            element.alt = source.alt;
            element.draggable = false;
            element.decoding = "async";
            element.dataset.galleryImage = String(index);
            const record: GalleryImage = { element, borrowed: false, decoded: false };
            this.entries.set(index, record);
            element.addEventListener("load", () => {
                this.setLoadState(index, "loaded");
                if (
                    !/\.gif(?:[?#]|$)/i.test(source.src) ||
                    record.poster ||
                    element.src.startsWith("data:")
                )
                    return;
                try {
                    const canvas = document.createElement("canvas");
                    const scale = Math.min(
                        1,
                        750 / Math.max(element.naturalWidth, element.naturalHeight)
                    );
                    canvas.width = Math.max(1, Math.round(element.naturalWidth * scale));
                    canvas.height = Math.max(1, Math.round(element.naturalHeight * scale));
                    const context = canvas.getContext("2d");
                    if (!context) return;
                    context.drawImage(element, 0, 0, canvas.width, canvas.height);
                    record.poster = canvas.toDataURL("image/webp", 0.85);
                    this.syncPlayback(index, record);
                } catch {
                    /* Cross-origin images may not allow a canvas poster. */
                }
            });
            element.addEventListener("error", () => this.setLoadState(index, "error"));
            element.src = source.src;
            entry = record;
        }
        return entry;
    }

    connect(index: number, home: HTMLElement) {
        this.homes.set(index, home);
        const entry = this.entries.get(index);
        if (entry) {
            if (!entry.borrowed) home.appendChild(entry.element);
            if (entry.element.complete && entry.element.naturalWidth)
                this.setLoadState(index, "loaded");
        }
        return () => {
            if (this.homes.get(index) !== home) return;
            this.homes.delete(index);
            const current = this.entries.get(index);
            if (current && !current.borrowed) current.element.remove();
        };
    }

    load(index: number) {
        const entry = this.get(index);
        const home = this.homes.get(index);
        if (!entry.borrowed && home && entry.element.parentElement !== home)
            home.appendChild(entry.element);
        this.syncPlayback(index, entry);
    }

    async decode(index: number) {
        const entry = this.get(index);
        entry.borrowed = true;
        this.syncPlayback(index, entry);
        // Safari may discard decoded pixels while a tile is offscreen. Recheck
        // the actual element before each entrance, even if its URL is cached.
        await entry.element.decode();
        entry.decoded = true;
        return entry.element;
    }

    take(index: number, host: HTMLElement) {
        const entry = this.get(index);
        entry.borrowed = true;
        host.appendChild(entry.element);
        return entry.element;
    }

    release(index: number) {
        const entry = this.entries.get(index);
        if (!entry) return;
        entry.borrowed = false;
        entry.element.removeAttribute("style");
        const home = this.homes.get(index);
        if (home) home.appendChild(entry.element);
        else entry.element.remove();
        this.syncPlayback(index, entry);
    }

    freeze(anchor: number) {
        this.frozen = true;
        this.anchor = anchor;
        for (const [index, entry] of this.entries) this.syncPlayback(index, entry);
    }

    resume() {
        this.frozen = false;
        this.anchor = -1;
        for (const [index, entry] of this.entries) this.syncPlayback(index, entry);
    }

    private setLoadState(index: number, state: string) {
        const home = this.homes.get(index);
        if (!home) return;
        home.dataset.loadState = state;
        home.setAttribute("aria-busy", "false");
    }

    private syncPlayback(index: number, entry: GalleryImage) {
        if (!/\.gif(?:[?#]|$)/i.test(this.images[index].src)) return;
        const paused = this.frozen && index !== this.anchor && !entry.borrowed;
        const src = paused ? entry.poster : this.images[index].src;
        if (entry.element.getAttribute("src") === (src ?? null)) return;
        entry.decoded = false;
        if (src) entry.element.src = src;
        else entry.element.removeAttribute("src");
    }
}
