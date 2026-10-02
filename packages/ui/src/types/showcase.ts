export interface ShowcaseGalleryImage {
    src: string;
    alt: string;
    // Static first frame for animated artwork; must retain the original aspect ratio.
    posterSrc?: string;
    // Pairs this image with the next one in the lightbox - see ProjectImage.
    pairMode?: "row" | "stack";
}

// Same shape as shared/ui/ToolBadge's ToolBadgeData - duplicated here
// instead of imported so shared/types doesn't reach into shared/ui.
export interface ShowcaseToolBadge {
    id: string;
    icon: string;
    title: string;
    description: string;
}

// Generic "showcase item" shape — used for any card-based collection:
// products, case studies, integrations, portfolio work, etc.
export interface ShowcaseItem {
    id: number;
    slug: string;
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
    // Already resolved to display data (icon/title/description) - see
    // entities/toolBadge/lib/resolveToolBadges. Modal only renders the
    // TOOLS section when this is present.
    tools?: ShowcaseToolBadge[];
    websiteUrl?: string;
    // Modal accent color (see Project.accentColorModal).
    accentColorModal?: string;
}
