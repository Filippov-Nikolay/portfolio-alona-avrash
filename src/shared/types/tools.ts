import type { ProjectImage } from "./project-image";

// Original scaffold referenced an undeclared `ObjTools` type for `name` —
// tools.json has never had real data to infer its shape from, so this is
// typed as a plain string (the tool's name, e.g. "Figma") until real
// content defines otherwise.
export interface Tool {
    id: number;
    logo: ProjectImage;
    name: string;
    bgImage: ProjectImage[];
}
