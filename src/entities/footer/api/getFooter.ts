import { fetchContent } from "@/shared/api/contentClient";
import type { FooterContent } from "../model/footer";

export function getFooter(): Promise<FooterContent> {
    return fetchContent<FooterContent>("footer", "footer");
}
