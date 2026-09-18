import type { ProjectImage } from "@/shared/types/project-image";

export interface HeroFloatingImage {
    id: string;
    image: ProjectImage;
}

export interface HeroI18n {
    description: string;
}

export interface HeroContentRaw {
    availableForWork: boolean;
    floatingImages: HeroFloatingImage[];
    i18n: Record<string, HeroI18n>;
}

export interface HeroContent {
    description: string;
    availableForWork: boolean;
    floatingImages: HeroFloatingImage[];
}
