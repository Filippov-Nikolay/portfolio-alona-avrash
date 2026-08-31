import { fetchContent } from "@/shared/api/contentClient";
import type { Review } from "../model/review";

export function getReviews(): Promise<Review[]> {
    return fetchContent<Review[]>("reviews", "reviews");
}
