"use client";

import { useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { ASSET_BASE_URL, assetUrl } from "@/shared/config/assets";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { cn } from "@/shared/lib/cn";
import { PAIR_MODE_OPTIONS } from "@/entities/project/model/constants";
import { uploadProjectImageAction } from "@/entities/project/api/uploadProjectImage";
import { useAutoScrollWhileDragging } from "./useAutoScrollWhileDragging";
import type { ImageDraft } from "./ImageDraft";
import styles from "./ImageGalleryEditor.module.css";

interface ImageGalleryEditorProps {
    images: ImageDraft[];
    onChange: (images: ImageDraft[]) => void;
}

function nextDraftId(images: ImageDraft[]): number {
    return images.reduce((max, image) => Math.max(max, image.id), -1) + 1;
}

export function ImageGalleryEditor({ images, onChange }: ImageGalleryEditorProps) {
    function updateById(id: number, patch: Partial<ImageDraft>) {
        onChange(images.map((image) => (image.id === id ? { ...image, ...patch } : image)));
    }

    function setHero(id: number) {
        onChange(images.map((image) => ({ ...image, isHero: image.id === id })));
    }

    function remove(id: number) {
        const wasHero = images.find((image) => image.id === id)?.isHero;
        const rest = images.filter((image) => image.id !== id);
        if (wasHero && rest.length > 0) {
            rest[0] = { ...rest[0], isHero: true };
        }
        onChange(rest);
    }

    function add() {
        onChange([
            ...images,
            {
                id: nextDraftId(images),
                src: "",
                alt: "",
                pairMode: "",
                isHero: images.length === 0,
            },
        ]);
    }

    return (
        <div className={styles.list}>
            {images.length === 0 && <p className={styles.empty}>No images yet.</p>}

            {images.length > 0 && (
                <Reorder.Group
                    as="div"
                    axis="y"
                    values={images}
                    onReorder={onChange}
                    className={styles.dragList}
                >
                    {images.map((image, index) => (
                        <ImageRow
                            key={image.id}
                            image={image}
                            order={index + 1}
                            onUpdate={(patch) => updateById(image.id, patch)}
                            onSetHero={() => setHero(image.id)}
                            onRemove={() => remove(image.id)}
                        />
                    ))}
                </Reorder.Group>
            )}

            <Button variant="secondary" onClick={add} className={styles.addButton}>
                Add item
            </Button>

            <p className={styles.hint}>
                Previews resolve against {ASSET_BASE_URL} - make sure the site&apos;s dev server is
                running to see them.
            </p>
        </div>
    );
}

function DragHandleIcon() {
    return (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <circle cx="9" cy="5" r="1.75" />
            <circle cx="9" cy="12" r="1.75" />
            <circle cx="9" cy="19" r="1.75" />
            <circle cx="15" cy="5" r="1.75" />
            <circle cx="15" cy="12" r="1.75" />
            <circle cx="15" cy="19" r="1.75" />
        </svg>
    );
}

function TrashIcon() {
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
            <path d="M4 7h16" />
            <path d="M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7" />
            <path d="M18.5 7 17.7 19a2 2 0 0 1-2 1.9H8.3a2 2 0 0 1-2-1.9L5.5 7" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
        </svg>
    );
}

function StarIcon({ filled }: { filled: boolean }) {
    return (
        <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill={filled ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
        >
            <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />
        </svg>
    );
}

interface ImageRowProps {
    image: ImageDraft;
    order: number;
    onUpdate: (patch: Partial<ImageDraft>) => void;
    onSetHero: () => void;
    onRemove: () => void;
}

function ImageRow({ image, order, onUpdate, onSetHero, onRemove }: ImageRowProps) {
    const dragControls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);
    useAutoScrollWhileDragging(isDragging);

    const [localPreview, setLocalPreview] = useState<string | null>(null);
    const [uploading, setUploading] = useState(false);
    const [uploadError, setUploadError] = useState<string | null>(null);
    const [confirmingRemove, setConfirmingRemove] = useState(false);

    async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0];
        e.target.value = "";
        if (!file) return;

        const objectUrl = URL.createObjectURL(file);
        setLocalPreview(objectUrl);
        setUploadError(null);
        setUploading(true);
        try {
            const { src } = await uploadProjectImageAction(file);
            onUpdate({ src });
        } catch (err) {
            setUploadError(err instanceof Error ? err.message : "Upload failed.");
        } finally {
            setUploading(false);
            URL.revokeObjectURL(objectUrl);
            setLocalPreview(null);
        }
    }

    const previewSrc = localPreview ?? (image.src ? assetUrl(image.src) : null);

    return (
        <Reorder.Item
            as="div"
            value={image}
            dragListener={false}
            dragControls={dragControls}
            onDragStart={() => setIsDragging(true)}
            onDragEnd={() => setIsDragging(false)}
            className={cn(styles.row, isDragging && styles.rowDragging)}
        >
            <div className={styles.rowHeader}>
                <label
                    className={cn(styles.heroToggle, image.isHero && styles.heroToggleActive)}
                    title={image.isHero ? "Hero image" : "Set as hero image"}
                >
                    <input
                        type="radio"
                        name="hero-image"
                        className={styles.heroInput}
                        checked={image.isHero}
                        onChange={onSetHero}
                    />
                    <StarIcon filled={image.isHero} />
                </label>
                <div className={styles.headerActions}>
                    <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => setConfirmingRemove(true)}
                        aria-label="Remove image"
                        title="Remove image"
                    >
                        <TrashIcon />
                    </button>
                    <button
                        type="button"
                        className={styles.dragHandle}
                        onPointerDown={(e) => dragControls.start(e)}
                        aria-label={`Drag to reorder, currently position ${order}`}
                        title="Drag to reorder"
                    >
                        <DragHandleIcon />
                    </button>
                </div>
            </div>

            <div className={styles.rowBody}>
                <label className={styles.preview}>
                    <input
                        type="file"
                        accept="image/*"
                        className={styles.fileInput}
                        onChange={handleFileSelected}
                    />
                    <span className={styles.orderOverlay}>{order}</span>
                    {previewSrc ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewSrc} alt="" className={styles.thumb} />
                            <span className={styles.changeOverlay} aria-hidden="true">
                                Change
                            </span>
                        </>
                    ) : (
                        <span className={styles.placeholder}>Click to upload</span>
                    )}
                    {uploading && <span className={styles.uploadingOverlay}>Uploading...</span>}
                </label>

                <div className={styles.fields}>
                    <input
                        className={styles.inputReadOnly}
                        readOnly
                        tabIndex={-1}
                        value={image.src}
                        placeholder="No file uploaded yet"
                        title={image.src || undefined}
                    />
                    <input
                        className={styles.input}
                        placeholder="Alt text (optional)"
                        value={image.alt}
                        onChange={(e) => onUpdate({ alt: e.target.value })}
                    />
                    <select
                        className={styles.select}
                        value={image.pairMode}
                        onChange={(e) =>
                            onUpdate({ pairMode: e.target.value as ImageDraft["pairMode"] })
                        }
                    >
                        {PAIR_MODE_OPTIONS.map((option) => (
                            <option key={option.value} value={option.value}>
                                {option.label}
                            </option>
                        ))}
                    </select>
                    {uploadError && <span className={styles.fieldError}>{uploadError}</span>}
                </div>
            </div>

            <ConfirmDialog
                open={confirmingRemove}
                title="Remove image"
                message="Remove this image from the gallery? This can't be undone."
                confirmLabel="Remove"
                danger
                onConfirm={() => {
                    setConfirmingRemove(false);
                    onRemove();
                }}
                onCancel={() => setConfirmingRemove(false)}
            />
        </Reorder.Item>
    );
}
