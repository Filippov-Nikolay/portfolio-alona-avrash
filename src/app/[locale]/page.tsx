import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/widgets/HeroSection";
import { GallerySection } from "@/widgets/GallerySection";
import { ProjectsSection } from "@/widgets/ProjectsSection";
import { ClientsSection } from "@/widgets/ClientsSection";
import { ToolsSection } from "@/widgets/ToolsSection";
import { ShowcaseSection } from "@/widgets/ShowcaseSection";
import { ServicesSection } from "@/widgets/ServicesSection";
import { ReviewSection } from "@/widgets/ReviewSection";
import { CtaSection } from "@/widgets/CtaSection";
import { ContactSection } from "@/widgets/ContactSection";
import type { CategoryKey } from "@/shared/types";
import {
    getAllProjects,
    getSelectedWork,
    toShowcaseItem,
} from "@/entities/project/lib/resolveProjects";
import { getHomeProjectGalleryCards } from "@/entities/home-project-gallery/lib/resolveHomeProjectGallery";
import { getHomeProjectGallery } from "@/entities/home-project-gallery/api/getHomeProjectGallery";
import { getServices } from "@/entities/service/api/getServices";
import { getReviews } from "@/entities/review/api/getReviews";
import { getStats } from "@/entities/stat/api/getStats";
import { getClients } from "@/entities/client/api/getClients";
import { getTools } from "@/entities/tool/api/getTools";
import { getCta } from "@/entities/cta/api/getCta";
import { Card } from "@/widgets/ToolsSection/components/Card/Card";

// Showcase (primary carousel, under the Hero) gets the most recent
// projects; Gallery (secondary, browsable) gets the rest.
const SHOWCASE_COUNT = 4;

interface HomePageProps {
    params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params;

    const [
        tCategories,
        tShowcase,
        tGallery,
        tSelectedWork,
        tProjects,
        tClients,
        tTools,
        tReviews,
        allProjects,
        homeProjectGallery,
        services,
        reviews,
        stats,
        clients,
        tools,
        cta,
    ] = await Promise.all([
        getTranslations({ locale, namespace: "categories" }),
        getTranslations({ locale, namespace: "showcase" }),
        getTranslations({ locale, namespace: "gallery" }),
        getTranslations({ locale, namespace: "selectedWork" }),
        getTranslations({ locale, namespace: "projects" }),
        getTranslations({ locale, namespace: "clients" }),
        getTranslations({ locale, namespace: "tools" }),
        getTranslations({ locale, namespace: "reviews" }),
        getAllProjects(),
        getHomeProjectGallery(),
        getServices(),
        getReviews(),
        getStats(),
        getClients(),
        getTools(),
        getCta(),
    ]);
    const translateCategory = (key: CategoryKey) => tCategories(key);

    const selectedWorkProjects = getSelectedWork(allProjects);
    const projectsSectionCards = getHomeProjectGalleryCards(homeProjectGallery);
    const showcaseProjects = allProjects.slice(0, SHOWCASE_COUNT);
    const galleryProjects = allProjects.slice(SHOWCASE_COUNT);

    const selectedWorkModalItems = selectedWorkProjects.map((project, i) =>
        toShowcaseItem(project, i, translateCategory, false)
    );
    const selectedWorkCategoryLabels = selectedWorkProjects.map((project) =>
        project.categories.map(translateCategory)
    );
    const projectsModalItems = allProjects.map((project, i) =>
        toShowcaseItem(project, i, translateCategory, false)
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
    const projectsLabels = {
        title: tProjects("title"),
        viewAll: tProjects("viewAll"),
        viewLabel: tProjects("viewLabel"),
    };
    const clientsLabels = {
        label: tClients("label"),
    };
    const toolsLabels = {
        title: tTools("title"),
        description: tTools("description"),
    };
    const reviewsLabels = {
        title: tReviews("title"),
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
            <ProjectsSection
                projects={allProjects}
                cards={projectsSectionCards}
                visibleCardCount={homeProjectGallery.visibleCardCount}
                modalItems={projectsModalItems}
                labels={projectsLabels}
            />
            <ClientsSection rows={clients.rows} labels={clientsLabels} />
            <ToolsSection tools={tools} labels={toolsLabels} />
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
            <ReviewSection reviews={reviews} labels={reviewsLabels} />
            <CtaSection content={cta} />
            <ContactSection />
        </main>
    );
}
