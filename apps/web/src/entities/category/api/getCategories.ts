import { fetchContent } from "@/shared/api/contentClient";
import type { CategoryOption } from "@avrash/content-schema";

export function getCategories(): Promise<CategoryOption[]> {
    return fetchContent<CategoryOption[]>("categories", "categories");
}
