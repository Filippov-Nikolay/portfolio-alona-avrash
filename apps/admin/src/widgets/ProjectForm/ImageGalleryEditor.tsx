"use client";

import { useRef, useState } from "react";
import { Reorder, useDragControls } from "framer-motion";
import { GripVertical, ImagePlus, Plus, Star, Trash2, Upload } from "lucide-react";
import { ASSET_BASE_URL, assetUrl } from "@/shared/config/assets";
import { Button } from "@/shared/ui/Button";
import { ConfirmDialog } from "@/shared/ui/ConfirmDialog";
import { cn } from "@/shared/lib/cn";
import { PAIR_MODE_OPTIONS } from "@/entities/project/model/constants";
import { uploadProjectImageAction } from "@/entities/project/api/uploadProjectImage";
import { useAutoScrollWhileDragging } from "./useAutoScrollWhileDragging";
import { usePointerYTracker } from "./usePointerYTracker";
import type { ImageDraft } from "./ImageDraft";
import styles from "./ImageGalleryEditor.module.css";

interface ImageGalleryEditorProps {
    images: ImageDraft[];
    onChange: (images: ImageDraft[]) => void;
    onDraggingChange?: (dragging: boolean) => void;
    scrollBoundsRef?: React.RefObject<HTMLElement | null>;
}

function nextDraftId(images: ImageDraft[]): number {
    return images.reduce((max, image) => Math.max(max, image.id), -1) + 1;
}

export function ImageGalleryEditor({
    images,
    onChange,
    onDraggingChange,
    scrollBoundsRef,
}: ImageGalleryEditorProps) {
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

    const listRef = useRef<HTMLDivElement>(null);
    const pointerY = usePointerYTracker();

    return (
        <div className={styles.list}>
            {images.length === 0 && (
                <div className={styles.empty}>
                    <ImagePlus size={22} strokeWidth={1.6} aria-hidden="true" />
                    <div>
                        <strong>No gallery images</strong>
                        <span>Add the first image to build the project story.</span>
                    </div>
                </div>
            )}

            {images.length > 0 && (
                <Reorder.Group
                    as="div"
                    ref={listRef}
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
                            constraintsRef={listRef}
                            pointerY={pointerY}
                            onDraggingChange={onDraggingChange}
                            scrollBoundsRef={scrollBoundsRef}
                            onUpdate={(patch) => updateById(image.id, patch)}
                            onSetHero={() => setHero(image.id)}
                            onRemove={() => remove(image.id)}
                        />
                    ))}
                </Reorder.Group>
            )}

            <Button variant="secondary" onClick={add} className={styles.addButton}>
                <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
                Add image
            </Button>

            <p className={styles.hint}>
                Asset source: <span>{ASSET_BASE_URL}</span>
            </p>
        </div>
    );
}

interface ImageRowProps {
    image: ImageDraft;
    order: number;
    constraintsRef: React.RefObject<HTMLDivElement | null>;
    pointerY: React.RefObject<number>;
    onDraggingChange?: (dragging: boolean) => void;
    scrollBoundsRef?: React.RefObject<HTMLElement | null>;
    onUpdate: (patch: Partial<ImageDraft>) => void;
    onSetHero: () => void;
    onRemove: () => void;
}

function ImageRow({
    image,
    order,
    constraintsRef,
    pointerY,
    onDraggingChange,
    scrollBoundsRef,
    onUpdate,
    onSetHero,
    onRemove,
}: ImageRowProps) {
    const dragControls = useDragControls();
    const [isDragging, setIsDragging] = useState(false);
    useAutoScrollWhileDragging(isDragging, pointerY, scrollBoundsRef);

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
            const { src, posterSrc } = await uploadProjectImageAction(file);
            onUpdate({ src, posterSrc });
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
            dragConstraints={constraintsRef}
            dragElastic={0}
            dragMomentum={false}
            dragTransition={{ bounceStiffness: 500, bounceDamping: 40 }}
            transition={{ type: "spring", stiffness: 600, damping: 50, mass: 0.5 }}
            onDragStart={() => {
                setIsDragging(true);
                onDraggingChange?.(true);
            }}
            onDragEnd={() => {
                setIsDragging(false);
                onDraggingChange?.(false);
            }}
            className={cn(styles.row, isDragging && styles.rowDragging)}
        >
            <div className={styles.rowHeader}>
                <div className={styles.rowIdentity}>
                    <strong>Image {String(order).padStart(2, "0")}</strong>
                    {image.isHero && <span className={styles.heroBadge}>Hero</span>}
                </div>
                <div className={styles.headerActions}>
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
                        <Star
                            size={15}
                            strokeWidth={1.8}
                            fill={image.isHero ? "currentColor" : "none"}
                            aria-hidden="true"
                        />
                    </label>
                    <button
                        type="button"
                        className={styles.removeButton}
                        onClick={() => setConfirmingRemove(true)}
                        aria-label="Remove image"
                        title="Remove image"
                    >
                        <Trash2 size={15} strokeWidth={1.8} aria-hidden="true" />
                    </button>
                    <button
                        type="button"
                        className={styles.dragHandle}
                        onPointerDown={(e) => dragControls.start(e)}
                        aria-label={`Drag to reorder, currently position ${order}`}
                        title="Drag to reorder"
                    >
                        <GripVertical size={16} strokeWidth={1.8} aria-hidden="true" />
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
                        aria-label={`Upload image ${order}`}
                    />
                    <span className={styles.orderOverlay}>{order}</span>
                    {previewSrc ? (
                        <>
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={previewSrc} alt="" className={styles.thumb} />
                            <span className={styles.changeOverlay} aria-hidden="true">
                                <Upload size={15} strokeWidth={1.8} />
                                Replace
                            </span>
                        </>
                    ) : (
                        <span className={styles.placeholder}>Click to upload</span>
                    )}
                    {uploading && <span className={styles.uploadingOverlay}>Uploading...</span>}
                </label>

                <div className={styles.fields}>
                    <label className={styles.field}>
                        <span>Source</span>
                        <input
                            className={styles.inputReadOnly}
                            readOnly
                            tabIndex={-1}
                            value={image.src}
                            placeholder="No file uploaded yet"
                            title={image.src || undefined}
                        />
                    </label>
                    <label className={styles.field}>
                        <span>Alt text</span>
                        <input
                            className={styles.input}
                            placeholder="Describe the image"
                            value={image.alt}
                            onChange={(e) => onUpdate({ alt: e.target.value })}
                        />
                    </label>
                    <label className={styles.field}>
                        <span>Gallery layout</span>
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
                    </label>
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
