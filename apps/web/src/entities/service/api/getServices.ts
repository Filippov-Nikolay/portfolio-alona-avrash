import { fetchContent } from "@/shared/api/contentClient";
import { resolveLocaleContent } from "@/shared/lib/resolveLocaleContent";
import type { Service, ServiceRaw } from "@avrash/content-schema";

export async function getServices(locale: string): Promise<Service[]> {
    const raw = await fetchContent<ServiceRaw[]>("services", "services");
    return raw.map(({ i18n, ...rest }) => ({ ...rest, ...resolveLocaleContent(i18n, locale) }));
}
