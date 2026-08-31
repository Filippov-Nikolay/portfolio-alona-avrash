import { fetchContent } from "@/shared/api/contentClient";
import type { Service } from "../model/service";

export function getServices(): Promise<Service[]> {
    return fetchContent<Service[]>("services", "services");
}
