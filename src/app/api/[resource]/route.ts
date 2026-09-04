import { NextResponse } from "next/server";
import heroData from "@/entities/hero/model/hero.json";
import socialData from "@/entities/social/model/social.json";
import projectsData from "@/entities/project/model/projects.json";
import homeProjectGalleryData from "@/entities/home-project-gallery/model/home-project-gallery.json";
import servicesData from "@/entities/service/model/services.json";
import reviewsData from "@/entities/review/model/reviews.json";
import statsData from "@/entities/stat/model/stats.json";
import clientsData from "@/entities/client/model/clients.json";

const CONTENT: Record<string, unknown> = {
    hero: heroData,
    socials: socialData,
    projects: projectsData,
    "home-project-gallery": homeProjectGalleryData,
    services: servicesData,
    reviews: reviewsData,
    stats: statsData,
    clients: clientsData,
};

interface RouteParams {
    params: Promise<{ resource: string }>;
}

export async function GET(_request: Request, { params }: RouteParams) {
    const { resource } = await params;
    const data = CONTENT[resource];

    if (!data) {
        return NextResponse.json({ error: `Unknown resource: ${resource}` }, { status: 404 });
    }

    return NextResponse.json(data);
}
