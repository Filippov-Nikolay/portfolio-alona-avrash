import { notFound } from "next/navigation";
import { getAllProjects } from "@/entities/project/lib/resolveProjects";
import { slugifyProjectName } from "@/entities/project/lib/slug";

interface WorksLayoutProps {
    children: React.ReactNode;
    params: Promise<{ locale: string; slug?: string[] }>;
}

export default async function WorksLayout({ children, params }: WorksLayoutProps) {
    const { slug = [] } = await params;
    if (slug.length > 1) notFound();

    if (slug.length === 1) {
        const projects = await getAllProjects();
        if (!projects.some((project) => slugifyProjectName(project.name) === slug[0])) {
            notFound();
        }
    }

    return children;
}
