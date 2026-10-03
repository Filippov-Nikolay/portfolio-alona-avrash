import type { MetadataRoute } from "next";
import { getAllProjects } from "@/entities/project/lib/resolveProjects";
import { slugifyProjectName } from "@/entities/project/lib/slug";
import { LOCALES, DEFAULT_LOCALE } from "@/i18n/locales";
import { buildPageAlternates } from "@/shared/lib/seo";

const STATIC_ROUTES: Array<{ path: string; priority: number }> = [
    { path: "", priority: 1 },
    { path: "/works", priority: 0.8 },
    { path: "/contact", priority: 0.8 },
    { path: "/legal", priority: 0.3 },
    { path: "/legal/privacy", priority: 0.3 },
    { path: "/legal/cookies", priority: 0.3 },
    { path: "/legal/privacy-preferences", priority: 0.3 },
    { path: "/legal/terms", priority: 0.3 },
];

const PROJECT_PRIORITY = 0.6;

function localizedEntries(
    path: string,
    priority: number,
    lastModified?: Date
): MetadataRoute.Sitemap {
    return LOCALES.map(({ code }) => {
        const { canonical, languages } = buildPageAlternates(code, path);
        return {
            url: canonical,
            ...(lastModified ? { lastModified } : {}),
            changeFrequency: "monthly" as const,
            priority: code === DEFAULT_LOCALE ? priority : priority * 0.9,
            alternates: { languages },
        };
    });
}

function validDate(value: string): Date | undefined {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date;
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const projects = await getAllProjects();

    return [
        ...STATIC_ROUTES.flatMap(({ path, priority }) => localizedEntries(path, priority)),
        ...projects.flatMap((project) =>
            localizedEntries(
                `/works/${slugifyProjectName(project.name)}`,
                PROJECT_PRIORITY,
                validDate(project.createdAt)
            )
        ),
    ];
}
