import type { ShowcaseGalleryImage } from "../../types/showcase";

interface GalleryImage {
    element: HTMLImageElement;
    borrowed: boolean;
    decoded: boolean;
    loadState: "loading" | "loaded" | "error";
    sourceVersion: number;
    poster?: string;
    posterRequest?: Promise<void>;
    decoding?: Promise<void>;
}

// React owns empty hosts; the pool owns their image children. The very same
// decoded <img> travels from its tile to the lightbox and back.
export class GalleryImages {
    private entries = new Map<number, GalleryImage>();
    private homes = new Map<number, HTMLElement>();
    private frozen = false;
    private anchor = -1;
    private playback: Set<number> | null = null;

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
            const record: GalleryImage = {
                element,
                borrowed: false,
                decoded: false,
                loadState: "loading",
                sourceVersion: 0,
                poster: source.posterSrc,
            };
            this.entries.set(index, record);
            element.addEventListener("load", () => {
                this.setLoadState(index, "loaded");
            });
            element.addEventListener("error", () => {
                if (record.poster && element.getAttribute("src") === record.poster) {
                    record.poster = undefined;
                    this.setSource(record, source.src);
                    return;
                }
                this.setLoadState(index, "error");
            });
            this.setSource(record, this.source(index, record));
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
        await Promise.all([
            this.decodeElement(entry),
            // Cache only the small preview bytes before launching a GIF. There
            // is no duplicate image element or full-resolution decode copy.
            this.playback === null && this.anchor === index ? this.preparePoster(entry) : undefined,
        ]);
        return entry.element;
    }

    take(index: number, host: HTMLElement) {
        const entry = this.get(index);
        entry.borrowed = true;
        host.replaceChildren(entry.element);
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

    restoreTiles(exceptIndex: number) {
        for (const [index, entry] of this.entries) {
            if (index !== exceptIndex && entry.borrowed) this.release(index);
        }
    }

    async prepareTiles(indices: number[]) {
        // Only the tiles about to be exposed need decoding. Do not borrow them
        // back into the lightbox or wake images elsewhere in the gallery.
        await Promise.allSettled(
            indices.map(async (index) => {
                this.load(index);
                await this.decodeElement(this.get(index));
            })
        );
    }

    freeze(anchor: number) {
        this.frozen = true;
        this.anchor = anchor;
        this.playback = null;
        for (const [index, entry] of this.entries) this.syncPlayback(index, entry);
    }

    resume() {
        this.frozen = false;
        this.anchor = -1;
        this.playback = null;
        for (const [index, entry] of this.entries) this.syncPlayback(index, entry);
    }

    setLightboxPlayback(indices: number[]) {
        this.playback = new Set(indices);
        for (const [index, entry] of this.entries) this.syncPlayback(index, entry);
    }

    private preparePoster(entry: GalleryImage) {
        if (!entry.poster) return;
        entry.posterRequest ??= fetch(entry.poster, { cache: "force-cache" })
            .then(async (response) => {
                if (response.ok) await response.arrayBuffer();
            })
            .catch(() => {});
        return entry.posterRequest;
    }

    private setLoadState(index: number, state: GalleryImage["loadState"]) {
        const entry = this.entries.get(index);
        if (entry) entry.loadState = state;
        const home = this.homes.get(index);
        if (!home) return;
        home.dataset.loadState = state;
        home.setAttribute("aria-busy", "false");
    }

    private decodeElement(entry: GalleryImage): Promise<void> {
        if (entry.decoding) return entry.decoding;
        // One waiter follows all source changes, including GIF -> poster -> GIF.
        // Comparing URLs alone mistakes that round trip for the original request.
        const promise = this.decodeCurrentSource(entry).finally(() => {
            if (entry.decoding === promise) entry.decoding = undefined;
        });
        entry.decoding = promise;
        return promise;
    }

    private async decodeCurrentSource(entry: GalleryImage) {
        const image = entry.element;
        for (;;) {
            const version = entry.sourceVersion;
            let finishLoad!: () => void;
            const loaded = new Promise<void>((resolve) => {
                finishLoad = resolve;
            });
            // decode() can reject before the error event switches a failed
            // preview back to the original. Subscribe first and let that fallback
            // finish before deciding whether this is an actual image failure.
            image.addEventListener("load", finishLoad);
            image.addEventListener("error", finishLoad);
            try {
                try {
                    await image.decode();
                } catch (error) {
                    if (version !== entry.sourceVersion) continue;
                    // complete can already be true for a broken resource while
                    // its error event is still queued. Wait for our load state,
                    // not that flag, so the fallback handler gets to run.
                    if (entry.loadState === "loading") await loaded;
                    if (version !== entry.sourceVersion) continue;
                    // A loaded image remains usable even when an interrupted
                    // decode rejects. In particular, retain its closing FLIP.
                    if (!image.naturalWidth) throw error;
                }
                if (version !== entry.sourceVersion) continue;
                entry.decoded = true;
                return;
            } finally {
                image.removeEventListener("load", finishLoad);
                image.removeEventListener("error", finishLoad);
            }
        }
    }

    private setSource(entry: GalleryImage, src: string) {
        if (entry.element.getAttribute("src") === src) return;
        entry.sourceVersion++;
        entry.decoded = false;
        entry.loadState = "loading";
        entry.element.src = src;
    }

    private syncPlayback(index: number, entry: GalleryImage) {
        if (!/\.gif(?:[?#]|$)/i.test(this.images[index].src)) return;
        this.setSource(entry, this.source(index, entry));
    }

    private source(index: number, entry: GalleryImage) {
        const paused =
            // Thumbnails use the small static preview. Decode/play the original
            // only when borrowed by the lightbox, never on modal entrance.
            !entry.borrowed ||
            (this.frozen && (this.playback ? !this.playback.has(index) : index !== this.anchor));
        return paused && entry.poster ? entry.poster : this.images[index].src;
    }
}
