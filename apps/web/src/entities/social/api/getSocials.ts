import { fetchContent } from "@/shared/api/contentClient";
import type { Social } from "@avrash/content-schema";

export function getSocials(): Promise<Social[]> {
    return fetchContent<Social[]>("socials", "socials");
}
