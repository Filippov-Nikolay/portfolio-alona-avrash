import { listProjects } from "@/entities/project/api/projectsRepository";
import { listOptions } from "@/entities/optionList/api/optionListRepository";
import type { CategoryOption } from "@avrash/content-schema";
import { ProjectsTable } from "@/widgets/ProjectsTable";
import { Button } from "@/shared/ui/Button";
import styles from "./page.module.css";

export default async function ProjectsPage() {
    const [projects, categoryOptions] = await Promise.all([
        listProjects(),
        listOptions("categories.json") as Promise<CategoryOption[]>,
    ]);

    return (
        <div>
            <div className={styles.header}>
                <div>
                    <h1 className={styles.title}>Projects</h1>
                    <p className={styles.subtitle}>{projects.length} total</p>
                </div>
                <Button href="/works/projects/new" variant="primary">
                    New project
                </Button>
            </div>

            <ProjectsTable projects={projects} categoryOptions={categoryOptions} />
        </div>
    );
}
