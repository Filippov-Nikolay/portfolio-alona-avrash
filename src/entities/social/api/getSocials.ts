import { fetchContent } from "@/shared/api/contentClient";
import type { Social } from "../model/social";

export function getSocials(): Promise<Social[]> {
    return fetchContent<Social[]>("socials", "socials");
}
