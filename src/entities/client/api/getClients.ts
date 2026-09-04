import { fetchContent } from "@/shared/api/contentClient";
import type { ClientsConfig } from "../model/client";

export function getClients(): Promise<ClientsConfig> {
    return fetchContent<ClientsConfig>("clients", "clients");
}
