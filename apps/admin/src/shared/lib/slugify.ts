// Mirrors apps/web's slugifyProjectName exactly. Used both to preview a
// project's public URL (the site derives that slug from the name at
// render time, nothing stores it) and to turn a new category/tool label
// into the key it's stored and looked up by.
export function slugify(value: string): string {
    return value
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
