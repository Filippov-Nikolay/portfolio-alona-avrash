import type { CategoryKey } from "@/shared/types/category";
import type { ProjectImage } from "@/shared/types/project-image";

export interface ServiceI18n {
    description: string;
    approachLabel: string;
}

export interface ServiceRaw {
    id: number;
    title: CategoryKey;
    image: ProjectImage;
    i18n: Record<string, ServiceI18n>;
}

export interface Service {
    id: number;
    title: CategoryKey;
    description: string;
    approachLabel: string;
    image: ProjectImage;
}
