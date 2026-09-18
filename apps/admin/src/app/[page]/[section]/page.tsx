import { notFound } from "next/navigation";
import { findPage, findSection } from "@/shared/config/nav";
import { getSectionContent } from "@/shared/config/contentResources";
import { JsonViewer } from "@/shared/ui/JsonViewer";

interface SectionPageProps {
    params: Promise<{ page: string; section: string }>;
}

export default async function SectionPage({ params }: SectionPageProps) {
    const { page: pageSlug, section: sectionSlug } = await params;
    const page = findPage(pageSlug);
    const section = findSection(pageSlug, sectionSlug);

    if (!page || !section) {
        notFound();
    }

    const data = getSectionContent(pageSlug, sectionSlug);

    return (
        <div>
            <h1>
                {page.label} / {section.label}
            </h1>
            <JsonViewer data={data} />
        </div>
    );
}
