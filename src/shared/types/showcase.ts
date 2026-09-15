export interface ShowcaseGalleryImage {
    src: string;
    alt: string;
}

// Generic "showcase item" shape — used for any card-based collection:
// products, case studies, integrations, portfolio work, etc.
export interface ShowcaseItem {
    id: number;
    title: string;
    category?: string;
    color?: "orange" | "blue" | "purple";
    // Optional: real project data doesn't always have write-up copy —
    // Card/Modal only render this block when it's present.
    description?: string;
    highlights?: string[];
    tags: string[];
    src?: string;
    href?: string;
    secondaryHref?: string;
    featured?: boolean;
    // Non-hero project images, in order — the modal's gallery preview/tab.
    gallery: ShowcaseGalleryImage[];
    // ToolBadge ids (see shared/ui/ToolBadge/toolBadges.data.ts). Modal
    // only renders the TOOLS section when this is present.
    tools?: string[];
    websiteUrl?: string;
    // Modal accent color (see Project.accentColorModal).
    accentColorModal?: string;
}

export interface ShowcaseItemTranslation {
    title: string;
    category: string;
    description: string;
    highlights: string[];
}

export interface ShowcaseItemRaw extends Omit<ShowcaseItem, "title" | "category" | "description"> {
    i18n: Record<string, ShowcaseItemTranslation>;
}

// -- Primary showcase carousel (e.g. rendered right under the hero) --
export interface ShowcaseCarouselI18n {
    viewSource: string;
    more: string;
    moreDesc: string;
}

export interface ShowcaseCarouselData {
    i18n: Record<string, ShowcaseCarouselI18n>;
    items: ShowcaseItemRaw[];
}

// -- Secondary gallery (one featured item + a browsable collection) --
export interface GalleryI18n {
    subtitle: string;
    featured: string;
    primaryAction: string;
    secondaryAction: string;
    more: string;
    moreDesc: string;
    viewSource: string;
}

export interface GalleryData {
    collectionUrl: string;
    i18n: Record<string, GalleryI18n>;
    items: ShowcaseItemRaw[];
}
