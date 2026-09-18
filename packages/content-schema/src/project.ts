import type { CategoryKey } from "./category";
import type { ProjectImage } from "./project-image";

export interface ProjectHover {
    background: string;
    accentColor: string;
    buttonBackground: string;
    buttonTextColor: string;
}

export interface SelectedWorkMeta {
    rank: number;
}

export interface Project {
    id: number;
    image: ProjectImage[];
    createdAt: string;
    name: string;
    categories: CategoryKey[];
    hover: ProjectHover;
    selectedWork?: SelectedWorkMeta;
    // ToolBadge ids (see shared/ui/ToolBadge/toolBadges.data.ts).
    tools?: string[];
    websiteUrl?: string;
    // Modal accent color - drives the banner's flat-color side and the
    // active tab. Independent of hover.background so it can be tuned for
    // the modal without touching card hover states - defaults to
    // hover.background when unset.
    accentColorModal?: string;
}
