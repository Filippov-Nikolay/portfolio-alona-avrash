import { getTranslations } from "next-intl/server";
import { HeroSection } from "@/widgets/HeroSection";
import { GallerySection } from "@/widgets/GallerySection";
import { ShowcaseSection } from "@/widgets/ShowcaseSection";
import { ServicesSection } from "@/widgets/ServicesSection";
import { StatsSection } from "@/widgets/StatsSection";
import { ReviewSection } from "@/widgets/ReviewSection";
import { ContactSection } from "@/widgets/ContactSection";
import type { CategoryKey } from "@/shared/types";
import { getAllProjects, toShowcaseItem } from "@/entities/project/lib/resolveProjects";
import type { Service } from "@/entities/service/model/service";
import type { Review } from "@/entities/review/model/review";
import type { StatItem } from "@/entities/stat/model/stat";
import servicesData from "@/entities/service/model/services.json";
import reviewsData from "@/entities/review/model/reviews.json";
import statsData from "@/entities/stat/model/stats.json";

// Showcase (primary carousel, under the Hero) gets the most recent
// projects; Gallery (secondary, browsable) gets the rest.
const SHOWCASE_COUNT = 4;

interface HomePageProps {
    params: Promise<{ locale: string }>;
}

export default async function HomePage({ params }: HomePageProps) {
    const { locale } = await params;

    const [tCategories, tShowcase, tGallery] = await Promise.all([
        getTranslations({ locale, namespace: "categories" }),
        getTranslations({ locale, namespace: "showcase" }),
        getTranslations({ locale, namespace: "gallery" }),
    ]);
    const translateCategory = (key: CategoryKey) => tCategories(key);

    const allProjects = getAllProjects();
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
            <HeroSection />
            <ShowcaseSection
                initialItems={showcaseItems}
                initialFeaturedIndex={0}
                initialLabels={showcaseLabels}
            />
            <ServicesSection services={servicesData as Service[]} />
            <GallerySection
                initialItems={galleryItems}
                initialLabels={galleryLabels}
                collectionUrl="https://instagram.com/"
            />
            <StatsSection items={statsData as StatItem[]} />
            <ReviewSection reviews={reviewsData as Review[]} />
            <ContactSection />
        </main>
    );
}
