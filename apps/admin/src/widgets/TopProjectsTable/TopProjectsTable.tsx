"use client";

import Link from "next/link";
import { useMemo, useState, type CSSProperties } from "react";
import {
    ArrowDown,
    ArrowRight,
    ArrowUp,
    ArrowUpDown,
    ListFilter,
    RotateCcw,
    Search,
    X,
} from "lucide-react";
import type { ProjectSummary } from "@/entities/analytics/model/types";
import type { PeriodDays } from "@/entities/analytics/lib/period";
import styles from "./TopProjectsTable.module.css";

interface TopProjectsTableProps {
    projects: ProjectSummary[];
    projectNames: Record<string, string>;
    days: PeriodDays;
}

type SortKey = "name" | "opens" | "externalClicks" | "ctr" | "galleryViews" | "galleryViewRate";
type SortDirection = "asc" | "desc";
type ActivityFilter = "all" | "website" | "gallery" | "noFollowUp";

const SORT_OPTIONS: { value: SortKey; label: string }[] = [
    { value: "opens", label: "Popularity" },
    { value: "name", label: "Name" },
    { value: "externalClicks", label: "Web clicks" },
    { value: "ctr", label: "Web CTR" },
    { value: "galleryViews", label: "Gallery views" },
    { value: "galleryViewRate", label: "Gallery rate" },
];

function formatPercent(value: number): string {
    return `${(value * 100).toFixed(1)}%`;
}

function formatNumber(value: number): string {
    return new Intl.NumberFormat("en-US").format(value);
}

function defaultDirection(key: SortKey): SortDirection {
    return key === "name" ? "asc" : "desc";
}

interface SortButtonProps {
    column: SortKey;
    label: string;
    sortKey: SortKey;
    direction: SortDirection;
    onSort: (key: SortKey) => void;
}

function SortButton({ column, label, sortKey, direction, onSort }: SortButtonProps) {
    const active = sortKey === column;
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

export function TopProjectsTable({ projects, projectNames, days }: TopProjectsTableProps) {
    const [query, setQuery] = useState("");
    const [activityFilter, setActivityFilter] = useState<ActivityFilter>("all");
    const [sortKey, setSortKey] = useState<SortKey>("opens");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

    const visibleProjects = useMemo(() => {
        const normalizedQuery = query.trim().toLocaleLowerCase();
        const projectName = (project: ProjectSummary) =>
            projectNames[project.entityId] ?? project.entityId;
        const result = projects.filter((project) => {
            const matchesQuery = projectName(project).toLocaleLowerCase().includes(normalizedQuery);
            const matchesActivity =
                activityFilter === "all" ||
                (activityFilter === "website" && project.externalClicks > 0) ||
                (activityFilter === "gallery" && project.galleryViews > 0) ||
                (activityFilter === "noFollowUp" &&
                    project.externalClicks === 0 &&
                    project.galleryViews === 0);

            return matchesQuery && matchesActivity;
        });

        return result.sort((a, b) => {
            const comparison =
                sortKey === "name"
                    ? projectName(a).localeCompare(projectName(b), "en", {
                          numeric: true,
                          sensitivity: "base",
                      })
                    : a[sortKey] - b[sortKey];
            const ordered = sortDirection === "asc" ? comparison : -comparison;

            return (
                ordered ||
                projectName(a).localeCompare(projectName(b), "en", {
                    numeric: true,
                    sensitivity: "base",
                })
            );
        });
    }, [activityFilter, projectNames, projects, query, sortDirection, sortKey]);

    if (projects.length === 0) {
        return (
            <div className={styles.empty}>
                <p>No project views yet.</p>
            </div>
        );
    }

    const projectName = (project: ProjectSummary) =>
        projectNames[project.entityId] ?? project.entityId;
    const maxOpens = Math.max(...projects.map((project) => project.opens), 1);
    const projectHref = (entityId: string) =>
        `/dashboard/analytics/${encodeURIComponent(entityId)}?days=${days}`;
    const hasFilters = query.trim().length > 0 || activityFilter !== "all";
    const hasChanges = hasFilters || sortKey !== "opens" || sortDirection !== "desc";

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
        setActivityFilter("all");
        setSortKey("opens");
        setSortDirection("desc");
    };

    const ariaSort = (key: SortKey): "ascending" | "descending" | "none" =>
        sortKey === key ? (sortDirection === "asc" ? "ascending" : "descending") : "none";

    return (
        <>
            <div className={styles.toolbar} role="search" aria-label="Filter projects">
                <label className={styles.searchField}>
                    <span className={styles.srOnly}>Search projects by name</span>
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

                <div className={styles.filterControls}>
                    <label className={styles.selectControl}>
                        <ListFilter size={15} strokeWidth={1.8} aria-hidden="true" />
                        <span className={styles.srOnly}>Filter by engagement</span>
                        <select
                            value={activityFilter}
                            onChange={(event) =>
                                setActivityFilter(event.target.value as ActivityFilter)
                            }
                        >
                            <option value="all">All activity</option>
                            <option value="website">Website</option>
                            <option value="gallery">Gallery</option>
                            <option value="noFollowUp">No follow-up action</option>
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
                        className={styles.directionButton}
                        onClick={() =>
                            setSortDirection((current) => (current === "asc" ? "desc" : "asc"))
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
                        className={styles.resetFiltersButton}
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
                <div className={styles.empty}>
                    <p>No projects match these filters.</p>
                    {hasFilters && (
                        <button type="button" className={styles.resetButton} onClick={resetFilters}>
                            Reset filters
                        </button>
                    )}
                </div>
            ) : (
                <>
                    <div className={styles.tableWrap}>
                        <table className={styles.table}>
                            <caption className={styles.srOnly}>Project performance ranking</caption>
                            <thead>
                                <tr>
                                    <th className={styles.rankCol}>Rank</th>
                                    <th aria-sort={ariaSort("name")}>
                                        <SortButton
                                            column="name"
                                            label="Project"
                                            sortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={changeSort}
                                        />
                                    </th>
                                    <th className={styles.metricCol} aria-sort={ariaSort("opens")}>
                                        <SortButton
                                            column="opens"
                                            label="Opens"
                                            sortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={changeSort}
                                        />
                                    </th>
                                    <th
                                        className={styles.metricCol}
                                        aria-sort={ariaSort("externalClicks")}
                                    >
                                        <SortButton
                                            column="externalClicks"
                                            label="Website clicks"
                                            sortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={changeSort}
                                        />
                                    </th>
                                    <th
                                        className={styles.metricCol}
                                        aria-sort={ariaSort("galleryViews")}
                                    >
                                        <SortButton
                                            column="galleryViews"
                                            label="Gallery views"
                                            sortKey={sortKey}
                                            direction={sortDirection}
                                            onSort={changeSort}
                                        />
                                    </th>
                                    <th
                                        className={styles.openCol}
                                        aria-label="Open project analytics"
                                    />
                                </tr>
                            </thead>
                            <tbody>
                                {visibleProjects.map((project, index) => (
                                    <tr key={project.entityId}>
                                        <td className={styles.rankCol}>
                                            {String(index + 1).padStart(2, "0")}
                                        </td>
                                        <td>
                                            <Link
                                                href={projectHref(project.entityId)}
                                                className={styles.name}
                                            >
                                                {projectName(project)}
                                            </Link>
                                        </td>
                                        <td className={styles.metricCol}>
                                            <div className={styles.opensCell}>
                                                <strong>{formatNumber(project.opens)}</strong>
                                                <span
                                                    className={styles.opensTrack}
                                                    aria-hidden="true"
                                                >
                                                    <span
                                                        className={styles.opensFill}
                                                        style={
                                                            {
                                                                "--opens-width": `${(project.opens / maxOpens) * 100}%`,
                                                            } as CSSProperties
                                                        }
                                                    />
                                                </span>
                                            </div>
                                        </td>
                                        <td className={styles.metricCol}>
                                            <strong>{formatNumber(project.externalClicks)}</strong>
                                            <span className={styles.metricNote}>
                                                {formatPercent(project.ctr)} CTR
                                            </span>
                                        </td>
                                        <td className={styles.metricCol}>
                                            <strong>{formatNumber(project.galleryViews)}</strong>
                                            <span className={styles.metricNote}>
                                                {formatPercent(project.galleryViewRate)} view rate
                                            </span>
                                        </td>
                                        <td className={styles.openCol}>
                                            <Link
                                                href={projectHref(project.entityId)}
                                                className={styles.openLink}
                                                aria-label={`View analytics for ${projectName(project)}`}
                                                title="Open project analytics"
                                            >
                                                <ArrowRight
                                                    size={15}
                                                    strokeWidth={1.8}
                                                    aria-hidden="true"
                                                />
                                            </Link>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className={styles.cards}>
                        {visibleProjects.map((project, index) => (
                            <Link
                                key={project.entityId}
                                href={projectHref(project.entityId)}
                                className={styles.card}
                            >
                                <div className={styles.cardHeader}>
                                    <span className={styles.cardRank}>
                                        {String(index + 1).padStart(2, "0")}
                                    </span>
                                    <strong className={styles.cardName}>
                                        {projectName(project)}
                                    </strong>
                                    <span className={styles.cardArrow} aria-hidden="true">
                                        <ArrowRight size={16} strokeWidth={1.8} />
                                    </span>
                                </div>
                                <div className={styles.cardMetrics}>
                                    <div>
                                        <span>Opens</span>
                                        <strong>{formatNumber(project.opens)}</strong>
                                    </div>
                                    <div>
                                        <span>Website</span>
                                        <strong>{formatNumber(project.externalClicks)}</strong>
                                        <small>{formatPercent(project.ctr)} CTR</small>
                                    </div>
                                    <div>
                                        <span>Gallery</span>
                                        <strong>{formatNumber(project.galleryViews)}</strong>
                                        <small>{formatPercent(project.galleryViewRate)} rate</small>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </>
            )}
        </>
    );
}
