"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Check,
    FilePenLine,
    ListFilter,
    LoaderCircle,
    Pencil,
    RotateCcw,
    Search,
    Star,
    Trash2,
    X,
} from "lucide-react";
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

type StatusFilter = "all" | "featured" | "standard" | "draft";
type SortKey = "name" | "createdAt" | "selectedRank";
type SortDirection = "asc" | "desc";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "createdAt", label: "Created date" },
    { value: "name", label: "Name" },
    { value: "selectedRank", label: "Featured rank" },
];

function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
}

function defaultDirection(key: SortKey): SortDirection {
    return key === "createdAt" ? "desc" : "asc";
}

interface SortButtonProps {
    column: SortKey;
    label: string;
    sortKey: SortKey;
    direction: SortDirection;
    onSort: (key: SortKey) => void;
}

function SortButton({ column, label, sortKey, direction, onSort }: SortButtonProps) {
    const active = column === sortKey;
    const Icon = active ? (direction === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

    return (
        <button
            type="button"
            className={`${styles.sortButton} ${active ? styles.sortButtonActive : ""}`}
            onClick={() => onSort(column)}
            aria-label={`Sort by ${label}${active ? `, currently ${direction === "asc" ? "ascending" : "descending"}` : ""}`}
        >
            <span>{label}</span>
            <Icon size={13} strokeWidth={1.8} aria-hidden="true" />
        </button>
    );
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
            <div className={styles.confirmRow} role="group" aria-label={`Delete ${project.name}`}>
                <span>Delete?</span>
                <button
                    type="button"
                    className={`${styles.iconButton} ${styles.confirmDelete}`}
                    onClick={onDelete}
                    disabled={isDeleting}
                    aria-label={`Confirm deleting ${project.name}`}
                    title="Confirm delete"
                >
                    {isDeleting ? (
                        <LoaderCircle
                            className={styles.spinner}
                            size={15}
                            strokeWidth={1.8}
                            aria-hidden="true"
                        />
                    ) : (
                        <Check size={15} strokeWidth={2} aria-hidden="true" />
                    )}
                </button>
                <button
                    type="button"
                    className={styles.iconButton}
                    onClick={onCancel}
                    disabled={isDeleting}
                    aria-label="Cancel deletion"
                    title="Cancel"
                >
                    <X size={15} strokeWidth={1.8} aria-hidden="true" />
                </button>
            </div>
        );
    }

    return (
        <div className={styles.rowActions}>
            <Link
                href={`/works/projects/${project.id}`}
                className={styles.iconButton}
                aria-label={`Edit ${project.name}`}
                title="Edit project"
            >
                <Pencil size={15} strokeWidth={1.8} aria-hidden="true" />
            </Link>
            <button
                type="button"
                className={`${styles.iconButton} ${styles.deleteButton}`}
                onClick={onConfirm}
                aria-label={`Delete ${project.name}`}
                title="Delete project"
            >
                <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" />
            </button>
        </div>
    );
}

interface ProjectStatusProps {
    project: Project;
    hasDraft: boolean;
}

function ProjectStatus({ project, hasDraft }: ProjectStatusProps) {
    return (
        <div className={styles.statuses}>
            {project.selectedWork ? (
                <span className={`${styles.statusBadge} ${styles.featuredBadge}`}>
                    <Star size={11} strokeWidth={2} aria-hidden="true" />
                    Featured #{project.selectedWork.rank}
                </span>
            ) : (
                <span className={styles.statusBadge}>Standard</span>
            )}
            {hasDraft && (
                <span className={`${styles.statusBadge} ${styles.draftBadge}`}>
                    <FilePenLine size={11} strokeWidth={2} aria-hidden="true" />
                    Draft
                </span>
            )}
        </div>
    );
}

export function ProjectsTable({ projects, categoryOptions }: ProjectsTableProps) {
    const router = useRouter();
    const [confirmingId, setConfirmingId] = useState<number | null>(null);
    const [deletingId, setDeletingId] = useState<number | null>(null);
    const [draftProjectIds, setDraftProjectIds] = useState<Set<number>>(new Set());
    const [hasNewDraft, setHasNewDraft] = useState(false);
    const [query, setQuery] = useState("");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
    const [sortKey, setSortKey] = useState<SortKey>("createdAt");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const categoryLabels = useMemo(
        () => new Map(categoryOptions.map((option) => [option.key, option.label])),
        [categoryOptions]
    );

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setDraftProjectIds(new Set(listDraftProjectIds()));
        setHasNewDraft(hasNewProjectDraft());
    }, [projects]);

    const visibleProjects = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        const result = projects.filter((project) => {
            const categoryText = project.categories
                .map((category) => categoryLabels.get(category) ?? category)
                .join(" ")
                .toLocaleLowerCase();
            const matchesQuery =
                project.name.toLocaleLowerCase().includes(normalizedQuery) ||
                categoryText.includes(normalizedQuery);
            const matchesCategory =
                categoryFilter === "all" || project.categories.includes(categoryFilter);
            const matchesStatus =
                statusFilter === "all" ||
                (statusFilter === "featured" && Boolean(project.selectedWork)) ||
                (statusFilter === "standard" && !project.selectedWork) ||
                (statusFilter === "draft" && draftProjectIds.has(project.id));

            return matchesQuery && matchesCategory && matchesStatus;
        });

        return result.sort((a, b) => {
            let comparison: number;
            if (sortKey === "name") {
                comparison = a.name.localeCompare(b.name, "en", {
                    numeric: true,
                    sensitivity: "base",
                });
            } else if (sortKey === "selectedRank") {
                comparison =
                    (a.selectedWork?.rank ?? Number.MAX_SAFE_INTEGER) -
                    (b.selectedWork?.rank ?? Number.MAX_SAFE_INTEGER);
            } else {
                comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            }

            const ordered = sortDirection === "asc" ? comparison : -comparison;
            return ordered || a.name.localeCompare(b.name, "en", { sensitivity: "base" });
        });
    }, [
        categoryFilter,
        categoryLabels,
        draftProjectIds,
        projects,
        query,
        sortDirection,
        sortKey,
        statusFilter,
    ]);

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

    const changeSort = (nextKey: SortKey) => {
        if (nextKey === sortKey) {
            setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
            return;
        }

        setSortKey(nextKey);
        setSortDirection(defaultDirection(nextKey));
    };

    const resetFilters = () => {
        setQuery("");
        setCategoryFilter("all");
        setStatusFilter("all");
        setSortKey("createdAt");
        setSortDirection("desc");
    };

    const hasChanges =
        query.trim().length > 0 ||
        categoryFilter !== "all" ||
        statusFilter !== "all" ||
        sortKey !== "createdAt" ||
        sortDirection !== "desc";
    const ariaSort = (key: SortKey): "ascending" | "descending" | "none" =>
        sortKey === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none";

    return (
        <>
            {hasNewDraft && (
                <div className={styles.draftBanner} role="status">
                    <div className={styles.draftBannerMessage}>
                        <span className={styles.draftBannerIcon} aria-hidden="true">
                            <FilePenLine size={17} strokeWidth={1.8} />
                        </span>
                        <div>
                            <strong>Unsaved new project</strong>
                            <span>Draft preserved in this browser</span>
                        </div>
                    </div>
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
                <section className={styles.catalog} aria-label="Project catalog">
                    <div className={styles.toolbar} role="search" aria-label="Filter projects">
                        <label className={styles.searchField}>
                            <span className={styles.srOnly}>Search by project or category</span>
                            <Search size={15} strokeWidth={1.8} aria-hidden="true" />
                            <input
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder="Search projects"
                                autoComplete="off"
                            />
                            {query && (
                                <button
                                    type="button"
                                    className={styles.clearButton}
                                    onClick={() => setQuery("")}
                                    aria-label="Clear project search"
                                    title="Clear search"
                                >
                                    <X size={14} strokeWidth={1.8} aria-hidden="true" />
                                </button>
                            )}
                        </label>

                        <div className={styles.filters}>
                            <label className={styles.selectControl}>
                                <ListFilter size={15} strokeWidth={1.8} aria-hidden="true" />
                                <span className={styles.srOnly}>Filter by category</span>
                                <select
                                    value={categoryFilter}
                                    onChange={(event) => setCategoryFilter(event.target.value)}
                                >
                                    <option value="all">All categories</option>
                                    {categoryOptions.map((option) => (
                                        <option key={option.key} value={option.key}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <label className={styles.selectControl}>
                                <Star size={15} strokeWidth={1.8} aria-hidden="true" />
                                <span className={styles.srOnly}>Filter by status</span>
                                <select
                                    value={statusFilter}
                                    onChange={(event) =>
                                        setStatusFilter(event.target.value as StatusFilter)
                                    }
                                >
                                    <option value="all">All statuses</option>
                                    <option value="featured">Featured</option>
                                    <option value="standard">Standard</option>
                                    <option value="draft">Drafts</option>
                                </select>
                            </label>

                            <label className={styles.selectControl}>
                                <ArrowUpDown size={15} strokeWidth={1.8} aria-hidden="true" />
                                <span className={styles.srOnly}>Sort projects by</span>
                                <select
                                    value={sortKey}
                                    onChange={(event) => changeSort(event.target.value as SortKey)}
                                >
                                    {SORT_OPTIONS.map((option) => (
                                        <option key={option.value} value={option.value}>
                                            {option.label}
                                        </option>
                                    ))}
                                </select>
                            </label>

                            <button
                                type="button"
                                className={styles.iconButton}
                                onClick={() =>
                                    setSortDirection((current) =>
                                        current === "asc" ? "desc" : "asc"
                                    )
                                }
                                aria-label={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
                                title={`Sort ${sortDirection === "asc" ? "descending" : "ascending"}`}
                            >
                                {sortDirection === "asc" ? (
                                    <ArrowUp size={15} strokeWidth={1.8} aria-hidden="true" />
                                ) : (
                                    <ArrowDown size={15} strokeWidth={1.8} aria-hidden="true" />
                                )}
                            </button>

                            <button
                                type="button"
                                className={styles.iconButton}
                                onClick={resetFilters}
                                disabled={!hasChanges}
                                aria-label="Reset filters and sorting"
                                title="Reset filters and sorting"
                            >
                                <RotateCcw size={15} strokeWidth={1.8} aria-hidden="true" />
                            </button>
                        </div>

                        <span className={styles.resultsCount} aria-live="polite">
                            {visibleProjects.length} of {projects.length}
                        </span>
                    </div>

                    {visibleProjects.length === 0 ? (
                        <div className={styles.emptyFiltered}>
                            <p>No projects match these filters.</p>
                            <button
                                type="button"
                                className={styles.resetButton}
                                onClick={resetFilters}
                            >
                                Reset filters
                            </button>
                        </div>
                    ) : (
                        <>
                            <div className={styles.tableWrap}>
                                <table className={styles.table}>
                                    <caption className={styles.srOnly}>Projects catalog</caption>
                                    <thead>
                                        <tr>
                                            <th className={styles.thumbCol}>Preview</th>
                                            <th aria-sort={ariaSort("name")}>
                                                <SortButton
                                                    column="name"
                                                    label="Project"
                                                    sortKey={sortKey}
                                                    direction={sortDirection}
                                                    onSort={changeSort}
                                                />
                                            </th>
                                            <th>Categories</th>
                                            <th aria-sort={ariaSort("selectedRank")}>
                                                <SortButton
                                                    column="selectedRank"
                                                    label="Status"
                                                    sortKey={sortKey}
                                                    direction={sortDirection}
                                                    onSort={changeSort}
                                                />
                                            </th>
                                            <th aria-sort={ariaSort("createdAt")}>
                                                <SortButton
                                                    column="createdAt"
                                                    label="Created"
                                                    sortKey={sortKey}
                                                    direction={sortDirection}
                                                    onSort={changeSort}
                                                />
                                            </th>
                                            <th
                                                className={styles.actionsCol}
                                                aria-label="Actions"
                                            />
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {visibleProjects.map((project) => {
                                            const heroImage =
                                                project.image.find((image) => image.isHero) ??
                                                project.image[0];
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
                                                            <div
                                                                className={styles.thumbPlaceholder}
                                                                aria-hidden="true"
                                                            />
                                                        )}
                                                    </td>
                                                    <td>
                                                        <div className={styles.projectCell}>
                                                            <Link
                                                                href={`/works/projects/${project.id}`}
                                                                className={styles.name}
                                                            >
                                                                {project.name}
                                                            </Link>
                                                            <span>Project #{project.id}</span>
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <div className={styles.tags}>
                                                            {project.categories.length > 0 ? (
                                                                project.categories.map(
                                                                    (category) => (
                                                                        <span
                                                                            key={category}
                                                                            className={styles.tag}
                                                                        >
                                                                            {categoryLabels.get(
                                                                                category
                                                                            ) ?? category}
                                                                        </span>
                                                                    )
                                                                )
                                                            ) : (
                                                                <span className={styles.muted}>
                                                                    Uncategorized
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td>
                                                        <ProjectStatus
                                                            project={project}
                                                            hasDraft={hasDraft}
                                                        />
                                                    </td>
                                                    <td className={styles.dateCell}>
                                                        {formatDate(project.createdAt)}
                                                    </td>
                                                    <td className={styles.actionsCol}>
                                                        <RowActions
                                                            project={project}
                                                            isConfirming={isConfirming}
                                                            isDeleting={deletingId === project.id}
                                                            onConfirm={() =>
                                                                setConfirmingId(project.id)
                                                            }
                                                            onCancel={() => setConfirmingId(null)}
                                                            onDelete={() =>
                                                                handleDelete(project.id)
                                                            }
                                                        />
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            <div className={styles.cards}>
                                {visibleProjects.map((project) => {
                                    const heroImage =
                                        project.image.find((image) => image.isHero) ??
                                        project.image[0];
                                    const isConfirming = confirmingId === project.id;
                                    const hasDraft = draftProjectIds.has(project.id);

                                    return (
                                        <article key={project.id} className={styles.card}>
                                            <div className={styles.cardTop}>
                                                {heroImage ? (
                                                    // eslint-disable-next-line @next/next/no-img-element
                                                    <img
                                                        src={assetUrl(heroImage.src)}
                                                        alt=""
                                                        className={styles.cardThumb}
                                                    />
                                                ) : (
                                                    <div
                                                        className={styles.cardThumbPlaceholder}
                                                        aria-hidden="true"
                                                    />
                                                )}
                                                <div className={styles.cardInfo}>
                                                    <span className={styles.cardId}>
                                                        Project #{project.id}
                                                    </span>
                                                    <Link
                                                        href={`/works/projects/${project.id}`}
                                                        className={styles.name}
                                                    >
                                                        {project.name}
                                                    </Link>
                                                    <span className={styles.dateCell}>
                                                        {formatDate(project.createdAt)}
                                                    </span>
                                                </div>
                                            </div>

                                            <ProjectStatus project={project} hasDraft={hasDraft} />

                                            <div className={styles.tags}>
                                                {project.categories.length > 0 ? (
                                                    project.categories.map((category) => (
                                                        <span key={category} className={styles.tag}>
                                                            {categoryLabels.get(category) ??
                                                                category}
                                                        </span>
                                                    ))
                                                ) : (
                                                    <span className={styles.muted}>
                                                        Uncategorized
                                                    </span>
                                                )}
                                            </div>

                                            <RowActions
                                                project={project}
                                                isConfirming={isConfirming}
                                                isDeleting={deletingId === project.id}
                                                onConfirm={() => setConfirmingId(project.id)}
                                                onCancel={() => setConfirmingId(null)}
                                                onDelete={() => handleDelete(project.id)}
                                            />
                                        </article>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </section>
            )}
        </>
    );
}
