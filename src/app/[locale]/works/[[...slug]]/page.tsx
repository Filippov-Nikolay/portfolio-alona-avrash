import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations } from "next-intl/server";
import { WorksCatalog } from "@/widgets/WorksCatalog";
import type { CategoryKey } from "@/shared/types";
import { getAllProjects, toShowcaseItem } from "@/entities/project/lib/resolveProjects";
import { getCta } from "@/entities/cta/api/getCta";

const ALL_CATEGORY_KEYS: CategoryKey[] = ["ui-ux", "branding", "logo", "packaging", "web-design"];

interface WorksPageProps {
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: WorksPageProps): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: "nav" });

    return { title: t("works") };
}

export default async function WorksPage({ params }: WorksPageProps) {
    const { locale } = await params;

    const [tCategories, tWorksPage, allProjects, cta] = await Promise.all([
        getTranslations({ locale, namespace: "categories" }),
        getTranslations({ locale, namespace: "worksPage" }),
        getAllProjects(),
        getCta(),
    ]);
    const translateCategory = (key: CategoryKey) => tCategories(key);

    const categoryLabels = Object.fromEntries(
        ALL_CATEGORY_KEYS.map((key) => [key, translateCategory(key)])
    ) as Record<CategoryKey, string>;

    const modalItems = allProjects.map((project, i) =>
        toShowcaseItem(project, i, translateCategory, i === 0)
    );

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
                />
            </Suspense>
        </main>
    );
}
