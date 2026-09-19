import { z } from "zod";
import { CategoryKeySchema } from "./category";
import { ProjectImageSchema } from "./project-image";

export const ProjectHoverSchema = z.object({
    background: z.string().min(1),
    accentColor: z.string().min(1),
    buttonBackground: z.string().min(1),
    buttonTextColor: z.string().min(1),
});
export type ProjectHover = z.infer<typeof ProjectHoverSchema>;

export const SelectedWorkMetaSchema = z.object({
    rank: z.number().int().nonnegative(),
});
export type SelectedWorkMeta = z.infer<typeof SelectedWorkMetaSchema>;

export const ProjectSchema = z.object({
    id: z.number().int().nonnegative(),
    image: z.array(ProjectImageSchema),
    createdAt: z.string().min(1),
    name: z.string().min(1),
    categories: z.array(CategoryKeySchema),
    hover: ProjectHoverSchema,
    selectedWork: SelectedWorkMetaSchema.optional(),
    // ToolBadge ids (see shared/ui/ToolBadge/toolBadges.data.ts).
    tools: z.array(z.string()).optional(),
    websiteUrl: z.string().optional(),
    // Modal accent color - drives the banner's flat-color side and the
    // active tab. Independent of hover.background so it can be tuned for
    // the modal without touching card hover states - defaults to
    // hover.background when unset.
    accentColorModal: z.string().optional(),
});
export type Project = z.infer<typeof ProjectSchema>;

// What a Server Action receives from the admin form before a project has an
// id (create) or alongside one it already knows separately (update) - same
// shape as Project minus id, kept as a schema (not just Omit<Project, "id">)
// so it can actually be validated at the Server Action boundary, not just
// typed at compile time.
export const ProjectInputSchema = ProjectSchema.omit({ id: true });
export type ProjectInput = z.infer<typeof ProjectInputSchema>;
