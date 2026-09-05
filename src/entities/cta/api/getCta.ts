import { fetchContent } from "@/shared/api/contentClient";
import type { CtaContent } from "../model/cta";

export function getCta(): Promise<CtaContent> {
    return fetchContent<CtaContent>("cta", "cta");
}
