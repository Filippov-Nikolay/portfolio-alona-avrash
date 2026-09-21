import Link from "next/link";
import type { ProjectSummary } from "@/entities/analytics/model/types";
import type { PeriodDays } from "@/entities/analytics/lib/period";
import styles from "./TopProjectsTable.module.css";

interface TopProjectsTableProps {
    projects: ProjectSummary[];
    projectNames: Record<string, string>;
    days: PeriodDays;
}

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

export function TopProjectsTable({ projects, projectNames, days }: TopProjectsTableProps) {
    if (projects.length === 0) {
        return (
            <div className={styles.empty}>
                <p>No project views yet.</p>
            </div>
        );
    }

    return (
        <table className={styles.table}>
            <thead>
                <tr>
                    <th>Project</th>
                    <th>Views</th>
                    <th>Website clicks</th>
                    <th>CTR</th>
                    <th>Gallery views</th>
                    <th>Gallery rate</th>
                </tr>
            </thead>
            <tbody>
                {projects.map((project) => (
                    <tr key={project.entityId}>
                        <td>
                            <Link
                                href={`/dashboard/analytics/${encodeURIComponent(project.entityId)}?days=${days}`}
                                className={styles.name}
                            >
                                {projectNames[project.entityId] ?? project.entityId}
                            </Link>
                        </td>
                        <td>{project.opens}</td>
                        <td>{project.externalClicks}</td>
                        <td>{formatPercent(project.ctr)}</td>
                        <td>{project.galleryViews}</td>
                        <td>{formatPercent(project.galleryViewRate)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}
