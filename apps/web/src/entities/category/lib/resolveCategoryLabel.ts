import type { CategoryOption } from "@avrash/content-schema";

interface CategoryTranslator {
    (key: string): string;
    has(key: string): boolean;
}

export function buildCategoryTranslator(
    t: CategoryTranslator,
    categories: CategoryOption[]
): (key: string) => string {
    const labelByKey = new Map(categories.map((category) => [category.key, category.label]));

    return (key: string) => (t.has(key) ? t(key) : (labelByKey.get(key) ?? key));
}
