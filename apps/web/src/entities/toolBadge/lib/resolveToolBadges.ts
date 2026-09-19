import { getToolBadge, type ToolBadgeData } from "@avrash/ui";
import type { ToolBadgeOption } from "@avrash/content-schema";

const GENERIC_ICON = "/assets/tools/generic.svg";

export function resolveToolBadges(keys: string[], catalog: ToolBadgeOption[]): ToolBadgeData[] {
    const catalogByKey = new Map(catalog.map((tool) => [tool.key, tool]));

    return keys
        .map((key): ToolBadgeData | undefined => {
            const builtin = getToolBadge(key);
            if (builtin) return builtin;

            const fromCatalog = catalogByKey.get(key);
            if (!fromCatalog) return undefined;

            return {
                id: fromCatalog.key,
                icon: GENERIC_ICON,
                title: fromCatalog.label,
                description: "",
            };
        })
        .filter((tool): tool is ToolBadgeData => tool !== undefined);
}
