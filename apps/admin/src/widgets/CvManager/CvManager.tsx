"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
    Check,
    CircleAlert,
    Download,
    ExternalLink,
    FileText,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import {
    CvContentSchema,
    cvFileError,
    hasPdfSignature,
    type CvDocument,
} from "@avrash/content-schema";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";
import styles from "./CvManager.module.css";

type Draft = { file: File; url: string };

const PdfPreview = dynamic(() => import("./PdfPreview"), {
    ssr: false,
    loading: () => <p className={styles.previewLoading}>Loading preview…</p>,
});

function formatSize(bytes: number) {
    return bytes < 1024 * 1024
        ? `${Math.ceil(bytes / 1024)} KB`
        : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function CvManager({ initialDocument }: { initialDocument: CvDocument | null }) {
    const [document, setDocument] = useState(initialDocument);
    const [draft, setDraft] = useState<Draft | null>(null);
    const [pending, setPending] = useState<"saving" | "deleting" | null>(null);
    const [checking, setChecking] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const selectionRun = useRef(0);
    const busy = !!pending || checking;

    useEffect(
        () => () => {
            selectionRun.current += 1;
        },
        []
    );

    useEffect(() => {
        if (!draft) return;
        return () => URL.revokeObjectURL(draft.url);
    }, [draft]);

    useEffect(() => {
        if (!draft) return;
        const warnBeforeLeaving = (event: BeforeUnloadEvent) => {
            event.preventDefault();
            event.returnValue = "";
        };
        window.addEventListener("beforeunload", warnBeforeLeaving);
        return () => window.removeEventListener("beforeunload", warnBeforeLeaving);
    }, [draft]);

    async function selectFile(files: FileList | null) {
        if (!files?.length || busy) return;
        setError(null);
        setNotice(null);
        if (files.length !== 1) {
            setError("Choose one PDF at a time.");
            return;
        }
        const file = files[0];
        const validation = cvFileError(file);
        if (validation) {
            setError(validation);
            return;
        }
        const run = ++selectionRun.current;
        setChecking(true);
        try {
            const bytes = new Uint8Array(await file.arrayBuffer());
            if (selectionRun.current !== run) return;
            if (!hasPdfSignature(bytes))
                throw new Error("This file is not a valid PDF. Please export it again.");
            setDraft({ file, url: URL.createObjectURL(file) });
            setConfirmDelete(false);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Could not read this file.");
        } finally {
            if (selectionRun.current === run) setChecking(false);
        }
    }

    async function mutate(method: "POST" | "DELETE") {
        if (busy || (method === "POST" && !draft)) return;
        setPending(method === "POST" ? "saving" : "deleting");
        setError(null);
        setNotice(null);
        const body = new FormData();
        if (draft) body.set("file", draft.file);
        try {
            const response = await fetch("/api/cv", {
                method,
                body: method === "POST" ? body : undefined,
            });
            if (response.redirected)
                throw new Error("Your session expired. Sign in again before saving.");
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error || "Something went wrong. Please try again.");
            setDocument(CvContentSchema.parse(result.document));
            setDraft(null);
            setConfirmDelete(false);
            setNotice(
                method === "POST"
                    ? "CV saved. This is now the file linked on your website."
                    : "CV deleted. The download button will show that CV is unavailable."
            );
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Could not connect. Please try again."
            );
        } finally {
            setPending(null);
        }
    }

    const savedUrl = document ? `/api/cv?v=${document.id}` : null;
    const previewUrl = draft?.url ?? savedUrl;

    return (
        <div className={styles.manager}>
            <div className={styles.feedback} aria-live="polite" aria-atomic="true">
                {notice && (
                    <p className={styles.success}>
                        <Check size={17} aria-hidden="true" />
                        {notice}
                    </p>
                )}
                {error && (
                    <p className={styles.error} role="alert">
                        <CircleAlert size={17} aria-hidden="true" />
                        {error}
                    </p>
                )}
            </div>
            <div className={styles.layout}>
                <div className={styles.sidebar}>
                    <section className={styles.card} aria-labelledby="current-cv-title">
                        <div className={styles.cardHeading}>
                            <h2 id="current-cv-title">
                                <FileText size={18} aria-hidden="true" />
                                Website CV
                            </h2>
                            <span className={cn(styles.badge, document && styles.published)}>
                                {document ? "Published" : "Not uploaded"}
                            </span>
                        </div>
                        {document ? (
                            <>
                                <p className={styles.fileName}>{document.fileName}</p>
                                <p className={styles.meta}>PDF · {formatSize(document.size)}</p>
                                <dl className={styles.details}>
                                    <div>
                                        <dt>Last updated</dt>
                                        <dd>
                                            <time dateTime={document.updatedAt}>
                                                {new Intl.DateTimeFormat("en-GB", {
                                                    dateStyle: "medium",
                                                    timeZone: "UTC",
                                                }).format(new Date(document.updatedAt))}
                                            </time>
                                        </dd>
                                    </div>
                                    <div>
                                        <dt>Used in</dt>
                                        <dd>Header & mobile menu</dd>
                                    </div>
                                    <div>
                                        <dt>Languages</dt>
                                        <dd>One CV for all languages</dd>
                                    </div>
                                </dl>
                                <div className={styles.fileActions}>
                                    <a
                                        href={savedUrl!}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className={styles.link}
                                    >
                                        <ExternalLink size={15} aria-hidden="true" />
                                        Open PDF
                                    </a>
                                    <a
                                        href={`${savedUrl}&download=1`}
                                        download
                                        className={styles.link}
                                    >
                                        <Download size={15} aria-hidden="true" />
                                        Download
                                    </a>
                                </div>
                                {confirmDelete ? (
                                    <div
                                        className={styles.confirm}
                                        role="group"
                                        aria-label="Confirm CV deletion"
                                    >
                                        <p>
                                            Delete this CV? The download button will stay visible,
                                            but disabled until you upload a new CV.
                                        </p>
                                        <div className={styles.actions}>
                                            <Button
                                                variant="danger"
                                                disabled={busy}
                                                onClick={() => void mutate("DELETE")}
                                            >
                                                {pending === "deleting"
                                                    ? "Deleting…"
                                                    : "Delete permanently"}
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                disabled={busy}
                                                onClick={() => setConfirmDelete(false)}
                                            >
                                                Keep CV
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    <Button
                                        variant="ghost"
                                        className={styles.deleteButton}
                                        disabled={busy || !!draft}
                                        onClick={() => setConfirmDelete(true)}
                                    >
                                        <Trash2 size={15} aria-hidden="true" />
                                        Delete CV
                                    </Button>
                                )}
                            </>
                        ) : (
                            <p className={styles.description}>
                                Upload your CV to enable the download button on the website.
                                Visitors will always get the last saved version.
                            </p>
                        )}
                    </section>

                    <section
                        className={styles.card}
                        aria-labelledby="upload-cv-title"
                        aria-busy={busy}
                    >
                        <div className={styles.cardHeading}>
                            <h2 id="upload-cv-title">
                                <Upload size={18} aria-hidden="true" />
                                {document ? "Replace CV" : "Upload CV"}
                            </h2>
                        </div>
                        <p className={styles.description}>
                            Choose a PDF, check the preview, then save.{" "}
                            {document
                                ? "Your current CV stays available until you save the replacement."
                                : "The file is only uploaded when you save."}
                        </p>
                        <input
                            ref={input}
                            type="file"
                            accept="application/pdf,.pdf"
                            aria-label="Choose CV PDF"
                            className={styles.fileInput}
                            disabled={busy}
                            onChange={(event) => {
                                void selectFile(event.target.files);
                                event.target.value = "";
                            }}
                        />
                        <button
                            type="button"
                            className={cn(styles.dropzone, dragging && styles.dragging)}
                            disabled={busy}
                            onClick={() => input.current?.click()}
                            onDragOver={(event) => {
                                event.preventDefault();
                                if (!busy) setDragging(true);
                            }}
                            onDragLeave={() => setDragging(false)}
                            onDrop={(event) => {
                                event.preventDefault();
                                setDragging(false);
                                void selectFile(event.dataTransfer.files);
                            }}
                        >
                            <span className={styles.uploadIcon}>
                                <Upload size={22} aria-hidden="true" />
                            </span>
                            <strong>
                                {checking
                                    ? "Checking PDF…"
                                    : draft
                                      ? "Choose another PDF"
                                      : "Choose PDF"}
                            </strong>
                            <span>or drag and drop here</span>
                            <small>PDF only · Up to 4 MB</small>
                        </button>
                        {draft && (
                            <div className={styles.draft}>
                                <span className={cn(styles.badge, styles.unsaved)}>
                                    Unsaved changes
                                </span>
                                <p className={styles.fileName}>{draft.file.name}</p>
                                <p className={styles.meta}>
                                    {formatSize(draft.file.size)} · Ready to save
                                </p>
                                <div className={styles.actions}>
                                    <Button
                                        variant="primary"
                                        disabled={busy}
                                        onClick={() => void mutate("POST")}
                                    >
                                        <Check size={16} aria-hidden="true" />
                                        {pending === "saving" ? "Saving…" : "Save CV"}
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        disabled={busy}
                                        onClick={() => {
                                            setDraft(null);
                                            setError(null);
                                        }}
                                    >
                                        <X size={16} aria-hidden="true" />
                                        Discard
                                    </Button>
                                </div>
                            </div>
                        )}
                    </section>
                </div>

                <section className={styles.preview} aria-labelledby="cv-preview-title">
                    <div className={styles.previewHeading}>
                        <div>
                            <h2 id="cv-preview-title">
                                {draft ? "Preview before saving" : "Document preview"}
                            </h2>
                            <p>
                                {draft
                                    ? draft.file.name
                                    : (document?.fileName ?? "Your CV will appear here")}
                            </p>
                        </div>
                        {previewUrl && (
                            <a
                                className={styles.link}
                                href={previewUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <ExternalLink size={16} aria-hidden="true" />
                                <span>Open in new tab</span>
                            </a>
                        )}
                    </div>
                    {previewUrl ? (
                        <>
                            <PdfPreview
                                key={previewUrl}
                                label={draft ? "Selected CV preview" : "Saved CV preview"}
                                url={previewUrl}
                            />
                            <p className={styles.previewHint}>
                                Preview the layout here, or open the original PDF in a new tab.
                            </p>
                        </>
                    ) : (
                        <div className={styles.emptyPreview}>
                            <FileText size={48} strokeWidth={1} aria-hidden="true" />
                            <h3>A first look, before it goes live</h3>
                            <p>
                                Select your PDF to check its layout and content before publishing
                                it.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
