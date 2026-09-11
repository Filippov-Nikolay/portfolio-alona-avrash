import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { ShowcaseSection } from "@/widgets/ShowcaseSection";
import { GallerySection } from "@/widgets/GallerySection";
import { siteConfig } from "@/shared/config/site.config";
import type { CategoryKey } from "@/shared/types";
import { getAllProjects, toShowcaseItem } from "@/entities/project/lib/resolveProjects";

const SHOWCASE_COUNT = 4;

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

    const [tCategories, tShowcase, tGallery, allProjects] = await Promise.all([
        getTranslations({ locale, namespace: "categories" }),
        getTranslations({ locale, namespace: "showcase" }),
        getTranslations({ locale, namespace: "gallery" }),
        getAllProjects(),
    ]);
    const translateCategory = (key: CategoryKey) => tCategories(key);

    const showcaseProjects = allProjects.slice(0, SHOWCASE_COUNT);
    const galleryProjects = allProjects.slice(SHOWCASE_COUNT);

    const showcaseItems = showcaseProjects.map((project, i) =>
        toShowcaseItem(project, i, translateCategory, true)
    );
    const galleryItems = galleryProjects.map((project, i) =>
        toShowcaseItem(project, i, translateCategory, i === 0)
    );

    const showcaseLabels = {
        viewSource: tShowcase("viewSource"),
        more: tShowcase("more"),
        moreDesc: tShowcase("moreDesc"),
    };
    const galleryLabels = {
        subtitle: tGallery("subtitle"),
        featured: tGallery("featured"),
        primaryAction: tGallery("primaryAction"),
        secondaryAction: tGallery("secondaryAction"),
        more: tGallery("more"),
        moreDesc: tGallery("moreDesc"),
        viewSource: tGallery("viewSource"),
    };

    return (
        <main>
            <ShowcaseSection
                initialItems={showcaseItems}
                initialFeaturedIndex={0}
                initialLabels={showcaseLabels}
            />
            <GallerySection
                initialItems={galleryItems}
                initialLabels={galleryLabels}
                collectionUrl={siteConfig.links.instagram}
            />
        </main>
    );
}
