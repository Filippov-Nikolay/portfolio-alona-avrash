import type { ProjectImage } from "@/shared/types/project-image";

export interface HeroFloatingImage {
    id: string;
    image: ProjectImage;
}

export interface HeroContent {
    description: string;
    availableForWork: boolean;
    floatingImages: HeroFloatingImage[];
}
