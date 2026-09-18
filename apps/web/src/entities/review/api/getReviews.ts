import { fetchContent } from "@/shared/api/contentClient";
import { resolveLocaleContent } from "@/shared/lib/resolveLocaleContent";
import type { Review, ReviewRaw } from "@avrash/content-schema";

export async function getReviews(locale: string): Promise<Review[]> {
    const raw = await fetchContent<ReviewRaw[]>("reviews", "reviews");
    return raw.map(({ i18n, ...rest }) => ({ ...rest, ...resolveLocaleContent(i18n, locale) }));
}
