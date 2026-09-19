import { fetchContent } from "@/shared/api/contentClient";
import { CategoryOptionSchema, type CategoryOption } from "@avrash/content-schema";

export function getCategories(): Promise<CategoryOption[]> {
    return fetchContent("categories", "categories", CategoryOptionSchema.array());
}
