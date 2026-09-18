// The set of categories a project/service can belong to. Kept as a plain
// string union (not the CategoryOption object below) because that's the
// shape every real project actually stores in projects.json.
export type CategoryKey = "ui-ux" | "branding" | "logo" | "packaging" | "web-design";

// Lookup/display entry for a category — id + label, meant for building a
// category filter UI (see README's "Work" page idea). Deliberately a
// separate type from CategoryKey: don't conflate "the key stored on a
// project" with "the row in the category lookup table."
export interface CategoryOption {
    id: number;
    name: CategoryKey;
}
