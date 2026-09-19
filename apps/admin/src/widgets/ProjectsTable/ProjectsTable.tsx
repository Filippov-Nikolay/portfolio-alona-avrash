"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Project, CategoryOption } from "@avrash/content-schema";
import { assetUrl } from "@/shared/config/assets";
import { Button } from "@/shared/ui/Button";
import { deleteProjectAction } from "@/entities/project/api/actions";
import {
    clearDraft,
    hasNewProjectDraft,
    listDraftProjectIds,
} from "@/entities/project/lib/draftStorage";
import styles from "./ProjectsTable.module.css";

interface ProjectsTableProps {
    projects: Project[];
    categoryOptions: CategoryOption[];
}

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

interface RowActionsProps {
    project: Project;
    isConfirming: boolean;
    isDeleting: boolean;
    onConfirm: () => void;
    onCancel: () => void;
    onDelete: () => void;
}

function RowActions({
    project,
    isConfirming,
    isDeleting,
    onConfirm,
    onCancel,
    onDelete,
}: RowActionsProps) {
    if (isConfirming) {
        return (
            <div className={styles.confirmRow}>
                <span>Delete?</span>
                <Button variant="danger" onClick={onDelete} disabled={isDeleting}>
                    {isDeleting ? "..." : "Yes"}
                </Button>
                <Button variant="ghost" onClick={onCancel}>
                    No
                </Button>
            </div>
        );
    }

    return (
        <div className={styles.rowActions}>
            <Button href={`/works/projects/${project.id}`} variant="secondary">
                Edit
            </Button>
            <Button variant="danger" onClick={onConfirm}>
                Delete
            </Button>
        </div>
    );
}

export function ProjectsTable({ projects, categoryOptions }: ProjectsTableProps) {
    const router = useRouter();
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const categoryLabels = new Map(categoryOptions.map((option) => [option.key, option.label]));
    const [draftProjectIds, setDraftProjectIds] = useState<Set<number>>(new Set());
    const [hasNewDraft, setHasNewDraft] = useState(false);

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraftProjectIds(new Set(listDraftProjectIds()));
        setHasNewDraft(hasNewProjectDraft());
    }, [projects]);

    async function handleDelete(id: number) {
        setDeletingId(id);
        try {
            await deleteProjectAction(id);
            clearDraft(id);
            router.refresh();
        } finally {
            setDeletingId(null);
            setConfirmingId(null);
        }
    }

    return (
        <>
            {hasNewDraft && (
                <div className={styles.draftBanner}>
                    <span>You have an unsaved new project draft.</span>
                    <div className={styles.draftBannerActions}>
                        <Button href="/works/projects/new" variant="primary">
                            Continue editing
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                clearDraft("new");
                                setHasNewDraft(false);
                            }}
                        >
                            Discard
                        </Button>
                    </div>
                </div>
            )}

            {projects.length === 0 ? (
                <div className={styles.empty}>
                    <p>No projects yet.</p>
                    <Button href="/works/projects/new" variant="primary">
                        Add the first one
                    </Button>
                </div>
            ) : (
                <>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.thumbCol} />
                                <th>Name</th>
                                <th>Categories</th>
                                <th>Selected</th>
                                <th>Created</th>
                                <th className={styles.actionsCol} />
                            </tr>
                        </thead>
                        <tbody>
                            {projects.map((project) => {
                                const heroImage =
                                    project.image.find((image) => image.isHero) ?? project.image[0];
                                const isConfirming = confirmingId === project.id;
                                const hasDraft = draftProjectIds.has(project.id);

                                return (
                                    <tr key={project.id}>
                                        <td className={styles.thumbCol}>
                                            {heroImage ? (
                                                // eslint-disable-next-line @next/next/no-img-element
                                                <img
                                                    src={assetUrl(heroImage.src)}
                                                    alt=""
                                                    className={styles.thumb}
                                                />
                                            ) : (
                                                <div className={styles.thumbPlaceholder} />
                                            )}
                                        </td>
                                        <td>
                                            <div className={styles.nameCell}>
                                                <Link
                                                    href={`/works/projects/${project.id}`}
                                                    className={styles.name}
                                                >
                                                    {project.name}
                                                </Link>
                                                {hasDraft && (
                                                    <span
                                                        className={styles.draftBadge}
                                                        title="Has unsaved changes from a previous session"
                                                    >
                                                        Draft
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className={styles.tags}>
                                                {project.categories.map((category) => (
                                                    <span key={category} className={styles.tag}>
                                                        {categoryLabels.get(category) ?? category}
                                                    </span>
                                                ))}
                                            </div>
                                        </td>
                                        <td>
                                            {project.selectedWork ? (
                                                <span className={styles.rankBadge}>
                                                    #{project.selectedWork.rank}
                                                </span>
                                            ) : (
                                                <span className={styles.muted}>-</span>
                                            )}
                                        </td>
                                        <td className={styles.muted}>
                                            {formatDate(project.createdAt)}
                                        </td>
                                        <td className={styles.actionsCol}>
                                            <RowActions
                                                project={project}
                                                isConfirming={isConfirming}
                                                isDeleting={deletingId === project.id}
                                                onConfirm={() => setConfirmingId(project.id)}
                                                onCancel={() => setConfirmingId(null)}
                                                onDelete={() => handleDelete(project.id)}
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    <div className={styles.cards}>
                        {projects.map((project) => {
                            const heroImage =
                                project.image.find((image) => image.isHero) ?? project.image[0];
                            const isConfirming = confirmingId === project.id;
                            const hasDraft = draftProjectIds.has(project.id);

                            return (
                                <div key={project.id} className={styles.card}>
                                    <div className={styles.cardTop}>
                                        {heroImage ? (
                                            // eslint-disable-next-line @next/next/no-img-element
                                            <img
                                                src={assetUrl(heroImage.src)}
                                                alt=""
                                                className={styles.cardThumb}
                                            />
                                        ) : (
                                            <div className={styles.cardThumbPlaceholder} />
                                        )}
                                        <div className={styles.cardInfo}>
                                            <div className={styles.nameCell}>
                                                <Link
                                                    href={`/works/projects/${project.id}`}
                                                    className={styles.name}
                                                >
                                                    {project.name}
                                                </Link>
                                                {hasDraft && (
                                                    <span
                                                        className={styles.draftBadge}
                                                        title="Has unsaved changes from a previous session"
                                                    >
                                                        Draft
                                                    </span>
                                                )}
                                            </div>
                                            <div className={styles.cardMeta}>
                                                {project.selectedWork && (
                                                    <span className={styles.rankBadge}>
                                                        #{project.selectedWork.rank}
                                                    </span>
                                                )}
                                                <span className={styles.muted}>
                                                    {formatDate(project.createdAt)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {project.categories.length > 0 && (
                                        <div className={styles.tags}>
                                            {project.categories.map((category) => (
                                                <span key={category} className={styles.tag}>
                                                    {categoryLabels.get(category) ?? category}
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <RowActions
                                        project={project}
                                        isConfirming={isConfirming}
                                        isDeleting={deletingId === project.id}
                                        onConfirm={() => setConfirmingId(project.id)}
                                        onCancel={() => setConfirmingId(null)}
                                        onDelete={() => handleDelete(project.id)}
                                    />
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </>
    );
}
