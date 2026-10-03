import { fetchContent } from "@/shared/api/contentClient";
import type { ClientsConfig } from "@avrash/content-schema";

export function getClients(): Promise<ClientsConfig> {
    return fetchContent("clients");
}
