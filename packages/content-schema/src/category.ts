import { z } from "zod";

// The key stored on a project (Project.categories) and looked up against
// the category catalog (CategoryOption below). Was a fixed string union
// of the 5 built-in categories; widened to plain string once the admin's
// Global > Categories page could add more at runtime - the union could
// no longer describe what's actually valid.
export const CategoryKeySchema = z.string();
export type CategoryKey = z.infer<typeof CategoryKeySchema>;

// One entry in the admin-managed category catalog (@avrash/content-data's
// categories.json) - the pool of categories a project can be tagged with,
// editable from the admin's Global > Categories page.
export const CategoryOptionSchema = z.object({
    key: z.string().min(1),
    label: z.string().min(1),
});
export type CategoryOption = z.infer<typeof CategoryOptionSchema>;
