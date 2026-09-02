import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/widgets/HeroSection";
import { GallerySection } from "@/widgets/GallerySection";
import { ShowcaseSection } from "@/widgets/ShowcaseSection";
import { ServicesSection } from "@/widgets/ServicesSection";
import { ReviewSection } from "@/widgets/ReviewSection";
import { ContactSection } from "@/widgets/ContactSection";
import type { CategoryKey } from "@/shared/types";
import {
    getAllProjects,
    getSelectedWork,
    toShowcaseItem,
} from "@/entities/project/lib/resolveProjects";
import { getServices } from "@/entities/service/api/getServices";
import { getReviews } from "@/entities/review/api/getReviews";
import { getStats } from "@/entities/stat/api/getStats";

// Showcase (primary carousel, under the Hero) gets the most recent
// projects; Gallery (secondary, browsable) gets the rest.
const SHOWCASE_COUNT = 4;

interface HomePageProps {
    params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params;

    const [tCategories, tShowcase, tGallery, tSelectedWork, allProjects, services, reviews, stats] =
        await Promise.all([
            getTranslations({ locale, namespace: "categories" }),
            getTranslations({ locale, namespace: "showcase" }),
            getTranslations({ locale, namespace: "gallery" }),
            getTranslations({ locale, namespace: "selectedWork" }),
            getAllProjects(),
            getServices(),
            getReviews(),
            getStats(),
        ]);
    const translateCategory = (key: CategoryKey) => tCategories(key);

    const selectedWorkProjects = getSelectedWork(allProjects);
    const showcaseProjects = allProjects.slice(0, SHOWCASE_COUNT);
    const galleryProjects = allProjects.slice(SHOWCASE_COUNT);

    const selectedWorkModalItems = selectedWorkProjects.map((project, i) =>
        toShowcaseItem(project, i, translateCategory, false)
    );
    const selectedWorkCategoryLabels = selectedWorkProjects.map((project) =>
        project.categories.map(translateCategory)
    );
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
    const selectedWorkLabels = {
        title: tSelectedWork("title"),
        viewAll: tSelectedWork("viewAll"),
        viewLabel: tSelectedWork("viewLabel"),
    };

    return (
        <main>
            <HeroSection
                stats={stats}
                selectedWork={{
                    projects: selectedWorkProjects,
                    modalItems: selectedWorkModalItems,
                    categoryLabels: selectedWorkCategoryLabels,
                    labels: selectedWorkLabels,
                }}
            />
            <div id="services-header-band-entry" aria-hidden="true" />
            <ServicesSection services={services} />
            <div id="services-header-band-exit" aria-hidden="true" />
            <ShowcaseSection
                initialItems={showcaseItems}
                initialFeaturedIndex={0}
                initialLabels={showcaseLabels}
            />
            <GallerySection
                initialItems={galleryItems}
                initialLabels={galleryLabels}
                collectionUrl="https://instagram.com/"
            />
            <ReviewSection reviews={reviews} />
            <ContactSection />
        </main>
    );
}
