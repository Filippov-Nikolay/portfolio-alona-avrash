import type { CategoryKey } from "@/shared/types/category";
import type { ProjectImage } from "@/shared/types/project-image";

export interface Service {
    id: number;
    title: CategoryKey;
    description: string;
    image: ProjectImage;
}
