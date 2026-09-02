import type { CategoryKey } from "@/shared/types/category";
import type { ProjectImage } from "@/shared/types/project-image";

export interface Service {
    id: number;
    title: CategoryKey;
    description: string;
    // Short call-to-action label under the description (e.g. "Digital Design
    // Approach") — written per category, not derived from `title`.
    approachLabel: string;
    image: ProjectImage;
}
