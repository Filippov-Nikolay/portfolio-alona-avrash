// Must stay byte-for-byte identical to apps/web/src/entities/project/lib/slug.ts
// - that's the function trackEvent()'s entityId is actually derived from
// (via ShowcaseItem.slug), so this is how the analytics page maps a D1
// entity_id back to a real project name/id. The two apps never import each
// other directly (see the root README), so this is a deliberate duplicate,
// same as apps/admin/src/widgets/ProjectForm/.../toPreview.ts's own copy.
export function slugifyProjectName(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}
