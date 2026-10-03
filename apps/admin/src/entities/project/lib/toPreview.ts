import type {
    CategoryOption,
    Project,
    ProjectInput,
    ToolBadgeOption,
} from "@avrash/content-schema";
import type { ShowcaseItem, ShowcaseToolBadge } from "@avrash/ui";
import { getToolBadge } from "@avrash/ui";
import { assetUrl } from "@/shared/config/assets";

const GENERIC_TOOL_ICON = "/assets/tools/generic.svg";
const PREVIEW_ID = -1;

const COMBINING_DIACRITICS = new RegExp("[\\u0300-\\u036f]", "g");

function slugify(name: string): string {
    return name
        .toLowerCase()
        .normalize("NFKD")
        .replace(COMBINING_DIACRITICS, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

function resolveTools(keys: string[], catalog: ToolBadgeOption[]): ShowcaseToolBadge[] {
    const catalogByKey = new Map(catalog.map((tool) => [tool.key, tool]));

    return keys
        .map((key): ShowcaseToolBadge | undefined => {
            const builtin = getToolBadge(key);
            if (builtin) return { ...builtin, icon: assetUrl(builtin.icon) };

            const fromCatalog = catalogByKey.get(key);
            if (!fromCatalog) return undefined;

            return {
                id: fromCatalog.key,
                icon: assetUrl(GENERIC_TOOL_ICON),
                title: fromCatalog.label,
                description: "",
            };
        })
        .filter((tool): tool is ShowcaseToolBadge => tool !== undefined);
}

export function toPreviewProject(input: ProjectInput): Project {
    return {
        ...input,
        id: PREVIEW_ID,
        image: input.image.map((image) => ({ ...image, src: assetUrl(image.src) })),
    };
}

export function toPreviewShowcaseItem(
    input: ProjectInput,
    categoryOptions: CategoryOption[],
    toolOptions: ToolBadgeOption[]
): ShowcaseItem {
    const categoryLabelByKey = new Map(categoryOptions.map((option) => [option.key, option.label]));
    const heroImage = input.image.find((image) => image.isHero) ?? input.image[0];
    const gallery = input.image
        .filter((image) => !image.isHero)
        .sort((a, b) => a.order - b.order)
        .map((image) => ({
            src: assetUrl(image.src),
            ...(image.posterSrc ? { posterSrc: assetUrl(image.posterSrc) } : {}),
            alt: image.alt ?? input.name,
            pairMode: image.pairMode,
        }));

    return {
        id: PREVIEW_ID,
        slug: slugify(input.name),
        title: input.name,
        category: input.categories.map((key) => categoryLabelByKey.get(key) ?? key).join(" · "),
        color: "purple",
        tags: input.categories,
        src: heroImage?.src ? assetUrl(heroImage.src) : undefined,
        featured: Boolean(input.selectedWork),
        gallery,
        tools: input.tools?.length ? resolveTools(input.tools, toolOptions) : undefined,
        websiteUrl: input.websiteUrl,
        accentColorModal: input.accentColorModal ?? input.hover.background,
    };
}
