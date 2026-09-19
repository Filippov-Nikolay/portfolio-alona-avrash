"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { Project, CategoryOption, ToolBadgeOption } from "@avrash/content-schema";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { slugify } from "@/shared/lib/slugify";
import { cn } from "@/shared/lib/cn";
import {
    createProjectAction,
    deleteProjectAction,
    updateProjectAction,
} from "@/entities/project/api/actions";
import { addCategoryAction } from "@/entities/category/api/actions";
import { addToolBadgeAction } from "@/entities/toolBadge/api/actions";
import type { ProjectInput } from "@/entities/project/api/projectsRepository";
import {
    clearDraft,
    readDraft,
    writeDraft,
    type ProjectDraftId,
} from "@/entities/project/lib/draftStorage";
import { PreviewStage } from "@/widgets/PreviewStage";
import { ColorField } from "./ColorField";
import { ChipsField } from "./ChipsField";
import { ImageGalleryEditor } from "./ImageGalleryEditor";
import { toImageDrafts, fromImageDrafts, type ImageDraft } from "./ImageDraft";
import styles from "./ProjectForm.module.css";

function CancelIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M18 6 6 18" />
            <path d="M6 6l12 12" />
        </svg>
    );
}

function RestoreIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
        </svg>
    );
}

function PreviewIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
        </svg>
    );
}

function SaveIcon() {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

function ChevronIcon() {
    return (
        <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m6 9 6 6 6-6" />
        </svg>
    );
}

interface ProjectFormProps {
    project?: Project;
    categoryOptions: CategoryOption[];
    toolOptions: ToolBadgeOption[];
}

interface ProjectFormSnapshot {
    name: string;
    createdAt: string;
    websiteUrl: string;
    categories: string[];
    tools: string[];
    featured: boolean;
    rank: number;
    hoverBackground: string;
    hoverAccentColor: string;
    hoverButtonBackground: string;
    hoverButtonTextColor: string;
    accentColorModal: string;
    images: ImageDraft[];
}

function toDateInputValue(iso: string): string {
    return iso.slice(0, 10);
}

function todayDateInputValue(): string {
    return new Date().toISOString().slice(0, 10);
}

function buildDefaults(project?: Project): ProjectFormSnapshot {
    return {
        name: project?.name ?? "",
        createdAt: project ? toDateInputValue(project.createdAt) : todayDateInputValue(),
        websiteUrl: project?.websiteUrl ?? "",
        categories: project?.categories ?? [],
        tools: project?.tools ?? [],
        featured: Boolean(project?.selectedWork),
        rank: project?.selectedWork?.rank ?? 1,
        hoverBackground: project?.hover.background ?? "#000000",
        hoverAccentColor: project?.hover.accentColor ?? "#ffffff",
        hoverButtonBackground: project?.hover.buttonBackground ?? "#000000",
        hoverButtonTextColor: project?.hover.buttonTextColor ?? "#ffffff",
        accentColorModal: project?.accentColorModal ?? "",
        images: project ? toImageDrafts(project.image) : [],
    };
}

export function ProjectForm({
    project,
    categoryOptions: initialCategoryOptions,
    toolOptions: initialToolOptions,
}: ProjectFormProps) {
    const router = useRouter();
    const isEditing = Boolean(project);
    const draftId: ProjectDraftId = project ? project.id : "new";
    const nameId = useId();
    const createdAtId = useId();
    const websiteUrlId = useId();
    const rankId = useId();

    const defaults = buildDefaults(project);
    const [name, setName] = useState(defaults.name);
    const [createdAt, setCreatedAt] = useState(defaults.createdAt);
    const [websiteUrl, setWebsiteUrl] = useState(defaults.websiteUrl);
    const [categoryOptions, setCategoryOptions] = useState(initialCategoryOptions);
    const [categories, setCategories] = useState<string[]>(defaults.categories);
    const [toolOptions, setToolOptions] = useState(initialToolOptions);
    const [tools, setTools] = useState<string[]>(defaults.tools);
    const [featured, setFeatured] = useState(defaults.featured);
    const [rank, setRank] = useState(defaults.rank);
    const [hoverBackground, setHoverBackground] = useState(defaults.hoverBackground);
    const [hoverAccentColor, setHoverAccentColor] = useState(defaults.hoverAccentColor);
    const [hoverButtonBackground, setHoverButtonBackground] = useState(
        defaults.hoverButtonBackground
    );
    const [hoverButtonTextColor, setHoverButtonTextColor] = useState(defaults.hoverButtonTextColor);
    const [accentColorModal, setAccentColorModal] = useState(defaults.accentColorModal);
    const [images, setImages] = useState<ImageDraft[]>(defaults.images);

    const [saving, setSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [previewInput, setPreviewInput] = useState<ProjectInput | null>(null);
    const [confirmingDelete, setConfirmingDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const leftIntentionally = useRef(false);
    const snapshotData: ProjectFormSnapshot = {
        name,
        createdAt,
        websiteUrl,
        categories,
        tools,
        featured,
        rank,
        hoverBackground,
        hoverAccentColor,
        hoverButtonBackground,
        hoverButtonTextColor,
        accentColorModal,
        images,
    };
    const currentSnapshot = JSON.stringify(snapshotData);
    const [initialSnapshot] = useState(() => currentSnapshot);
    const isDirty = currentSnapshot !== initialSnapshot;
    const [restoredDraftAt, setRestoredDraftAt] = useState<string | null>(null);
    useEffect(() => {
        const draft = readDraft<ProjectFormSnapshot>(draftId);
        if (!draft) return;
        const d = draft.data;

        // Syncing from localStorage (an external system, unavailable
        // during SSR/the initial render) after mount - the case this
        // rule's own message carves out as legitimate.
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setName(d.name);
        setCreatedAt(d.createdAt);
        setWebsiteUrl(d.websiteUrl);
        setCategories(d.categories);
        setTools(d.tools);
        setFeatured(d.featured);
        setRank(d.rank);
        setHoverBackground(d.hoverBackground);
        setHoverAccentColor(d.hoverAccentColor);
        setHoverButtonBackground(d.hoverButtonBackground);
        setHoverButtonTextColor(d.hoverButtonTextColor);
        setAccentColorModal(d.accentColorModal);
        setImages(d.images);
        setRestoredDraftAt(draft.updatedAt);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        if (!isDirty) return;
        writeDraft(draftId, snapshotData);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentSnapshot, isDirty, draftId]);

    useEffect(() => {
        if (!isDirty) return;
        function handleBeforeUnload(e: BeforeUnloadEvent) {
            if (leftIntentionally.current) return;
            e.preventDefault();
            e.returnValue = "";
        }
        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => window.removeEventListener("beforeunload", handleBeforeUnload);
    }, [isDirty]);

    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [showRestoreConfirm, setShowRestoreConfirm] = useState(false);
    const [galleryExpanded, setGalleryExpanded] = useState(true);

    function goToProjects() {
        leftIntentionally.current = true;
        clearDraft(draftId);
        router.push("/works/projects");
    }

    function requestLeave() {
        if (isDirty) {
            setShowLeaveConfirm(true);
        } else {
            goToProjects();
        }
    }

    function discardDraft() {
        const fresh = buildDefaults(project);
        setName(fresh.name);
        setCreatedAt(fresh.createdAt);
        setWebsiteUrl(fresh.websiteUrl);
        setCategories(fresh.categories);
        setTools(fresh.tools);
        setFeatured(fresh.featured);
        setRank(fresh.rank);
        setHoverBackground(fresh.hoverBackground);
        setHoverAccentColor(fresh.hoverAccentColor);
        setHoverButtonBackground(fresh.hoverButtonBackground);
        setHoverButtonTextColor(fresh.hoverButtonTextColor);
        setAccentColorModal(fresh.accentColorModal);
        setImages(fresh.images);
        clearDraft(draftId);
        setRestoredDraftAt(null);
    }

    function toggleCategory(key: string) {
        setCategories((current) =>
            current.includes(key)
                ? current.filter((category) => category !== key)
                : [...current, key]
        );
    }

    function toggleTool(key: string) {
        setTools((current) =>
            current.includes(key) ? current.filter((tool) => tool !== key) : [...current, key]
        );
    }

    function buildInput(): ProjectInput | null {
        if (!name.trim()) {
            setError("Name is required.");
            return null;
        }
        if (categories.length === 0) {
            setError("Pick at least one category.");
            return null;
        }

        return {
            name: name.trim(),
            createdAt: new Date(`${createdAt}T00:00:00.000Z`).toISOString(),
            categories: categories as Project["categories"],
            hover: {
                background: hoverBackground,
                accentColor: hoverAccentColor,
                buttonBackground: hoverButtonBackground,
                buttonTextColor: hoverButtonTextColor,
            },
            image: fromImageDrafts(images),
            ...(featured ? { selectedWork: { rank } } : {}),
            ...(tools.length ? { tools } : {}),
            ...(websiteUrl.trim() ? { websiteUrl: websiteUrl.trim() } : {}),
            ...(accentColorModal.trim() ? { accentColorModal: accentColorModal.trim() } : {}),
        };
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        const input = buildInput();
        if (!input) return;

        setSaving(true);
        try {
            if (project) {
                await updateProjectAction(project.id, input);
            } else {
                await createProjectAction(input);
            }
            leftIntentionally.current = true;
            clearDraft(draftId);
            router.push("/works/projects");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Something went wrong.");
            setSaving(false);
        }
    }

    function handlePreview() {
        setError(null);
        const input = buildInput();
        if (!input) return;
        setPreviewInput(input);
    }

    async function handleDelete() {
        if (!project) return;
        setDeleting(true);
        try {
            await deleteProjectAction(project.id);
            leftIntentionally.current = true;
            clearDraft(draftId);
            router.push("/works/projects");
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not delete this project.");
            setDeleting(false);
            setConfirmingDelete(false);
        }
    }

    return (
        <div className={styles.page}>
            <div className={styles.topBar}>
                <button type="button" className={styles.backLink} onClick={requestLeave}>
                    &larr; Projects
                </button>
                <h1 className={styles.pageTitle}>{isEditing ? project!.name : "New project"}</h1>
            </div>

            {restoredDraftAt && (
                <div className={styles.draftNotice}>
                    <span>
                        Restored unsaved changes from {new Date(restoredDraftAt).toLocaleString()}.
                    </span>
                    <button
                        type="button"
                        className={styles.draftDiscardLink}
                        onClick={discardDraft}
                    >
                        Discard and use last saved version
                    </button>
                </div>
            )}

            <form className={styles.form} onSubmit={handleSubmit}>
                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Basic info</h2>

                    <div className={styles.field}>
                        <label htmlFor={nameId} className={styles.label}>
                            Name
                        </label>
                        <input
                            id={nameId}
                            className={styles.input}
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Project name"
                        />
                        {name.trim() && (
                            <span className={styles.hint}>URL: /works/{slugify(name)}</span>
                        )}
                    </div>

                    <div className={styles.fieldRow}>
                        <div className={styles.field}>
                            <label htmlFor={createdAtId} className={styles.label}>
                                Created at
                            </label>
                            <input
                                id={createdAtId}
                                type="date"
                                className={styles.input}
                                value={createdAt}
                                onChange={(e) => setCreatedAt(e.target.value)}
                            />
                        </div>

                        <div className={styles.field}>
                            <label htmlFor={websiteUrlId} className={styles.label}>
                                Website URL
                            </label>
                            <input
                                id={websiteUrlId}
                                className={styles.input}
                                value={websiteUrl}
                                onChange={(e) => setWebsiteUrl(e.target.value)}
                                placeholder="https://www.behance.net/gallery/..."
                            />
                        </div>
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Categories</h2>
                    <ChipsField
                        options={categoryOptions}
                        selected={categories}
                        onToggle={toggleCategory}
                        onAdd={addCategoryAction}
                        onAdded={(option) => {
                            setCategoryOptions((current) => [...current, option]);
                            setCategories((current) => [...current, option.key]);
                        }}
                        addNoun="category"
                    />
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Tools</h2>
                    <ChipsField
                        options={toolOptions}
                        selected={tools}
                        onToggle={toggleTool}
                        onAdd={addToolBadgeAction}
                        onAdded={(option) => {
                            setToolOptions((current) => [...current, option]);
                            setTools((current) => [...current, option.key]);
                        }}
                        addNoun="tool"
                    />
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Selected work</h2>
                    <label className={styles.checkboxRow}>
                        <input
                            type="checkbox"
                            checked={featured}
                            onChange={(e) => setFeatured(e.target.checked)}
                        />
                        Feature on the home page&apos;s Selected Work
                    </label>
                    {featured && (
                        <div className={styles.field}>
                            <label htmlFor={rankId} className={styles.label}>
                                Rank (lower shows first)
                            </label>
                            <input
                                id={rankId}
                                type="number"
                                min={1}
                                className={styles.inputSmall}
                                value={rank}
                                onChange={(e) => setRank(Number(e.target.value))}
                            />
                        </div>
                    )}
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Card hover colors</h2>
                    <div className={styles.colorGrid}>
                        <ColorField
                            label="Background"
                            value={hoverBackground}
                            onChange={setHoverBackground}
                        />
                        <ColorField
                            label="Accent (title/text)"
                            value={hoverAccentColor}
                            onChange={setHoverAccentColor}
                        />
                        <ColorField
                            label="Button background"
                            value={hoverButtonBackground}
                            onChange={setHoverButtonBackground}
                        />
                        <ColorField
                            label="Button text"
                            value={hoverButtonTextColor}
                            onChange={setHoverButtonTextColor}
                        />
                    </div>
                </section>

                <section className={styles.section}>
                    <h2 className={styles.sectionTitle}>Modal accent color</h2>
                    <p className={styles.sectionHint}>
                        Defaults to the hover background above when unset.
                    </p>
                    <ColorField
                        label="Accent"
                        value={accentColorModal}
                        onChange={setAccentColorModal}
                        allowEmpty
                    />
                </section>

                <section className={styles.section}>
                    <button
                        type="button"
                        className={styles.collapsibleHeader}
                        onClick={() => setGalleryExpanded((expanded) => !expanded)}
                        aria-expanded={galleryExpanded}
                    >
                        <h2 className={styles.sectionTitle}>
                            Gallery images
                            {images.length > 0 && (
                                <span className={styles.sectionCount}>{images.length}</span>
                            )}
                        </h2>
                        <span
                            className={cn(
                                styles.collapseIcon,
                                !galleryExpanded && styles.collapseIconCollapsed
                            )}
                        >
                            <ChevronIcon />
                        </span>
                    </button>
                    {galleryExpanded && <ImageGalleryEditor images={images} onChange={setImages} />}
                </section>

                {error && <p className={styles.error}>{error}</p>}

                {isEditing && (
                    <section className={styles.dangerZone}>
                        <div>
                            <h2 className={styles.dangerTitle}>Danger zone</h2>
                            <p className={styles.dangerHint}>
                                Permanently delete this project. This can&apos;t be undone.
                            </p>
                        </div>
                        <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
                            Delete project
                        </Button>
                    </section>
                )}

                <div className={styles.actions}>
                    <div className={styles.actionsLeft}>
                        <Button
                            variant="ghost"
                            onClick={requestLeave}
                            className={styles.cancelButton}
                            aria-label="Cancel"
                        >
                            <span className={styles.actionIcon}>
                                <CancelIcon />
                            </span>
                            <span className={styles.actionLabel}>Cancel</span>
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setShowRestoreConfirm(true)}
                            disabled={!isDirty}
                            className={styles.restoreButton}
                            aria-label="Restore changes"
                        >
                            <span className={styles.actionIcon}>
                                <RestoreIcon />
                            </span>
                            <span className={styles.actionLabel}>Restore changes</span>
                        </Button>
                        <Button
                            variant="primary"
                            type="submit"
                            disabled={saving || !isDirty}
                            className={styles.saveButton}
                            aria-label={
                                saving ? "Saving" : isEditing ? "Save changes" : "Create project"
                            }
                        >
                            <span className={styles.actionIcon}>
                                <SaveIcon />
                            </span>
                            <span className={styles.actionLabel}>
                                {saving
                                    ? "Saving..."
                                    : isEditing
                                      ? "Save changes"
                                      : "Create project"}
                            </span>
                        </Button>
                    </div>
                    <Button
                        variant="secondary"
                        onClick={handlePreview}
                        className={styles.previewButton}
                        aria-label="Preview"
                    >
                        <span className={styles.actionIcon}>
                            <PreviewIcon />
                        </span>
                        <span className={styles.actionLabel}>Preview</span>
                    </Button>
                </div>
            </form>

            <ConfirmDialog
                open={showLeaveConfirm}
                title="Unsaved changes"
                message="You have unsaved changes. Leave without saving?"
                confirmLabel="Leave without saving"
                cancelLabel="Keep editing"
                danger
                onConfirm={goToProjects}
                onCancel={() => setShowLeaveConfirm(false)}
            />

            <ConfirmDialog
                open={showRestoreConfirm}
                title="Restore changes"
                message={
                    isEditing
                        ? "Discard your unsaved changes and go back to the last saved version of this project?"
                        : "Discard your unsaved changes and start over with a blank form?"
                }
                confirmLabel="Restore"
                cancelLabel="Keep editing"
                danger
                onConfirm={() => {
                    discardDraft();
                    setShowRestoreConfirm(false);
                }}
                onCancel={() => setShowRestoreConfirm(false)}
            />

            <ConfirmDialog
                open={confirmingDelete}
                title="Delete project"
                message={`Delete "${project?.name}"? This can't be undone.`}
                confirmLabel="Delete"
                danger
                pending={deleting}
                onConfirm={handleDelete}
                onCancel={() => setConfirmingDelete(false)}
            />

            {previewInput && (
                <PreviewStage
                    input={previewInput}
                    categoryOptions={categoryOptions}
                    toolOptions={toolOptions}
                    onClose={() => setPreviewInput(null)}
                />
            )}
        </div>
    );
}
