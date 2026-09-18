import type { ProjectImage } from "./project-image";

export interface Tool {
    id: number;
    name: string;
    // Path to the tool's outline icon (public/assets/tools).
    icon: string;
    // Work samples peeking out behind the card on hover — same shape as
    // entities/home-project-gallery, empty for a tool with none yet.
    images: ProjectImage[];
}
