import type { CategoryKey } from "@/shared/types/category";
import type { ProjectImage } from "@/shared/types/project-image";

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
}
