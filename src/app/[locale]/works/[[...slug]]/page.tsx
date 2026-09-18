import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { WorksCatalog } from "@/widgets/WorksCatalog";
import type { CategoryKey } from "@/shared/types";
import { getAllProjects, toShowcaseItem } from "@/entities/project/lib/resolveProjects";
import { slugifyProjectName } from "@/entities/project/lib/slug";
import { getCta } from "@/entities/cta/api/getCta";
import { siteConfig } from "@/shared/config/site.config";
import { getLocaleMeta } from "@/i18n/locales";
import { buildPageAlternates } from "@/shared/lib/seo";

const ALL_CATEGORY_KEYS: CategoryKey[] = ["ui-ux", "branding", "logo", "packaging", "web-design"];

interface WorksPageProps {
    params: Promise<{ locale: string; slug?: string[] }>;
}

export async function generateStaticParams() {
    const projects = await getAllProjects();
    return [
        { slug: [] },
        ...projects.map((project) => ({ slug: [slugifyProjectName(project.name)] })),
    ];
}

export async function generateMetadata({ params }: WorksPageProps): Promise<Metadata> {
    const { locale, slug } = await params;
    const [t, tCategories, tSeo] = await Promise.all([
        getTranslations({ locale, namespace: "nav" }),
        getTranslations({ locale, namespace: "categories" }),
        getTranslations({ locale, namespace: "seo" }),
    ]);
    const { ogLocale } = getLocaleMeta(locale);

    if (slug?.length === 1) {
        const projects = await getAllProjects();
        const project = projects.find((p) => slugifyProjectName(p.name) === slug[0]);
        if (project) {
            const heroImage = project.image.find((image) => image.isHero) ?? project.image[0];
            const description = project.categories.map((key) => tCategories(key)).join(" · ");
            const { canonical, languages } = buildPageAlternates(locale, `/works/${slug[0]}`);
            const ogTitle = `${project.name} | ${siteConfig.name}`;

            return {
                title: project.name,
                description,
                alternates: { canonical, languages },
                openGraph: {
                    title: ogTitle,
                    description,
                    url: canonical,
                    siteName: siteConfig.name,
                    type: "website",
                    locale: ogLocale,
                    images: heroImage?.src ? [{ url: heroImage.src }] : undefined,
                },
                twitter: {
                    card: "summary_large_image",
                    title: ogTitle,
                    description,
                    images: heroImage?.src ? [heroImage.src] : undefined,
                },
            };
        }
    }

    const title = t("works");
    const { canonical, languages } = buildPageAlternates(locale, "/works");
    const ogTitle = `${title} | ${siteConfig.name}`;

    return {
        title,
        alternates: { canonical, languages },
        openGraph: {
            title: ogTitle,
            description: tSeo("description"),
            url: canonical,
            siteName: siteConfig.name,
            type: "website",
            locale: ogLocale,
            images: [{ url: "/og/cover.png", width: 1200, height: 630 }],
        },
    };
}

export default async function WorksPage({ params }: WorksPageProps) {
    const { locale, slug } = await params;

    if (slug && slug.length > 1) notFound();

    const [tCategories, tWorksPage, allProjects, cta] = await Promise.all([
        getTranslations({ locale, namespace: "categories" }),
        getTranslations({ locale, namespace: "worksPage" }),
        getAllProjects(),
        getCta(locale),
    ]);
    const translateCategory = (key: CategoryKey) => tCategories(key);

    const categoryLabels = Object.fromEntries(
        ALL_CATEGORY_KEYS.map((key) => [key, translateCategory(key)])
    ) as Record<CategoryKey, string>;

    const modalItems = allProjects.map((project, i) =>
        toShowcaseItem(project, i, translateCategory, i === 0)
    );

    let initialSelectedId: number | null = null;
    if (slug?.[0]) {
        const item = modalItems.find((modalItem) => modalItem.slug === slug[0]);
        if (!item) notFound();
        initialSelectedId = item.id;
    }

    const labels = {
        title: tWorksPage("title"),
        subtitle: tWorksPage("subtitle"),
        allFilter: tWorksPage("allFilter"),
        sortLabel: tWorksPage("sortLabel"),
        sortLatest: tWorksPage("sortLatest"),
        sortOldest: tWorksPage("sortOldest"),
        sectionSuffix: tWorksPage("sectionSuffix"),
        viewProject: tWorksPage("viewProject"),
    };

    return (
        <main>
            <Suspense>
                <WorksCatalog
                    projects={allProjects}
                    modalItems={modalItems}
                    categoryLabels={categoryLabels}
                    cta={cta}
                    labels={labels}
                    initialSelectedId={initialSelectedId}
                />
            </Suspense>
        </main>
    );
}
