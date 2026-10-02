import { listProjects } from "@/entities/project/api/projectsRepository";
import { listOptions } from "@/entities/optionList/api/optionListRepository";
import type { CategoryOption } from "@avrash/content-schema";
import { FolderKanban, ImageIcon, Plus, Star, Tags } from "lucide-react";
import { ProjectsTable } from "@/widgets/ProjectsTable";
import { Button } from "@/shared/ui/Button";
import styles from "./page.module.css";

export default async function ProjectsPage() {
    const [projects, categoryOptions] = await Promise.all([
        listProjects(),
        listOptions("categories.json") as Promise<CategoryOption[]>,
    ]);
    const selectedCount = projects.filter((project) => project.selectedWork).length;
    const categoryCount = new Set(projects.flatMap((project) => project.categories)).size;
    const imageCount = projects.reduce((total, project) => total + project.image.length, 0);

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <p className={styles.eyebrow}>Portfolio content</p>
                    <h1 className={styles.title}>Projects</h1>
                    <p className={styles.subtitle}>
                        {projects.length} projects · {selectedCount} featured
                    </p>
                </div>
                <Button href="/works/projects/new" variant="primary" className={styles.newButton}>
                    <Plus size={16} strokeWidth={2} aria-hidden="true" />
                    New project
                </Button>
            </div>

            <section className={styles.summary} aria-label="Projects summary">
                <div className={styles.summaryItem}>
                    <span className={styles.summaryIcon} aria-hidden="true">
                        <FolderKanban size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.summaryLabel}>Total projects</span>
                    <strong>{projects.length}</strong>
                </div>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryIcon} aria-hidden="true">
                        <Star size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.summaryLabel}>Featured</span>
                    <strong>{selectedCount}</strong>
                </div>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryIcon} aria-hidden="true">
                        <Tags size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.summaryLabel}>Categories used</span>
                    <strong>{categoryCount}</strong>
                </div>
                <div className={styles.summaryItem}>
                    <span className={styles.summaryIcon} aria-hidden="true">
                        <ImageIcon size={17} strokeWidth={1.8} />
                    </span>
                    <span className={styles.summaryLabel}>Project images</span>
                    <strong>{imageCount}</strong>
                </div>
            </section>

            <ProjectsTable projects={projects} categoryOptions={categoryOptions} />
        </div>
    );
}
