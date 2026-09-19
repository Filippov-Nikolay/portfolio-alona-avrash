import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/widgets/HeroSection";
import { ProjectsSection } from "@/widgets/ProjectsSection";
import { ClientsSection } from "@/widgets/ClientsSection";
import { ToolsSection } from "@/widgets/ToolsSection";
import { ServicesSection } from "@/widgets/ServicesSection";
import { ReviewSection } from "@/widgets/ReviewSection";
import { CtaSection } from "@/widgets/CtaSection";
import {
    getAllProjects,
    getSelectedWork,
    toShowcaseItem,
} from "@/entities/project/lib/resolveProjects";
import { getHomeProjectGalleryCards } from "@/entities/home-project-gallery/lib/resolveHomeProjectGallery";
import { getHomeProjectGallery } from "@/entities/home-project-gallery/api/getHomeProjectGallery";
import { getCategories } from "@/entities/category/api/getCategories";
import { buildCategoryTranslator } from "@/entities/category/lib/resolveCategoryLabel";
import { getToolBadges } from "@/entities/toolBadge/api/getToolBadges";
import { getServices } from "@/entities/service/api/getServices";
import { getReviews } from "@/entities/review/api/getReviews";
import { getStats } from "@/entities/stat/api/getStats";
import { getClients } from "@/entities/client/api/getClients";
import { getTools } from "@/entities/tool/api/getTools";
import { getCta } from "@/entities/cta/api/getCta";
import { Card } from "@/widgets/ToolsSection/components/Card/Card";

interface HomePageProps {
    params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params;

    const [
        tCategories,
        tSelectedWork,
        tProjects,
        tClients,
        tTools,
        tReviews,
        allProjects,
        homeProjectGallery,
        categories,
        toolBadges,
        services,
        reviews,
        stats,
        clients,
        tools,
        cta,
    ] = await Promise.all([
        getTranslations({ locale, namespace: "categories" }),
        getTranslations({ locale, namespace: "selectedWork" }),
        getTranslations({ locale, namespace: "projects" }),
        getTranslations({ locale, namespace: "clients" }),
        getTranslations({ locale, namespace: "tools" }),
        getTranslations({ locale, namespace: "reviews" }),
        getAllProjects(),
        getHomeProjectGallery(),
        getCategories(),
        getToolBadges(),
        getServices(locale),
        getReviews(locale),
        getStats(),
        getClients(),
        getTools(),
        getCta(locale),
    ]);
    const translateCategory = buildCategoryTranslator(tCategories, categories);

    const selectedWorkProjects = getSelectedWork(allProjects);
    const projectsSectionCards = getHomeProjectGalleryCards(homeProjectGallery);

    const selectedWorkModalItems = selectedWorkProjects.map((project, i) =>
        toShowcaseItem(project, i, translateCategory, false, toolBadges)
    );
    const selectedWorkCategoryLabels = selectedWorkProjects.map((project) =>
        project.categories.map(translateCategory)
    );
    const projectsModalItems = allProjects.map((project, i) =>
        toShowcaseItem(project, i, translateCategory, false, toolBadges)
    );

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
                locale={locale}
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
            <ReviewSection reviews={reviews} labels={reviewsLabels} />
            <CtaSection content={cta} />
        </main>
    );
}
