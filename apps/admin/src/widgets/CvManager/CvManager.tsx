"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import {
    Check,
    CircleAlert,
    Download,
    ExternalLink,
    FileText,
    Languages,
    Trash2,
    Upload,
    X,
} from "lucide-react";
import {
    CvContentSchema,
    cvFileError,
    DEFAULT_SITE_LOCALE,
    hasPdfSignature,
    resolveCv,
    SITE_LOCALES,
    type CvContent,
    type SiteLocale,
} from "@avrash/content-schema";
import { Button } from "@/shared/ui/Button";
import { cn } from "@/shared/lib/cn";
import { CvLanguageSelect } from "./CvLanguageSelect";
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

const formatDate = (value: string) =>
    new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeZone: "UTC" }).format(
        new Date(value)
    );

const languageName = (code: string) =>
    SITE_LOCALES.find((locale) => locale.code === code)?.name ?? code.toUpperCase();

const savedUrl = (locale: string, id: string) =>
    `/api/cv?locale=${encodeURIComponent(locale)}&v=${id}`;

function initialLocale(content: CvContent): SiteLocale {
    return SITE_LOCALES.find((locale) => content.files[locale.code])?.code ?? DEFAULT_SITE_LOCALE;
}

export function CvManager({ initialContent }: { initialContent: CvContent }) {
    const [content, setContent] = useState(initialContent);
    const [selected, setSelected] = useState<SiteLocale>(() => initialLocale(initialContent));
    const [draft, setDraft] = useState<Draft | null>(null);
    const [pending, setPending] = useState<"saving" | "deleting" | null>(null);
    const [checking, setChecking] = useState(false);
    const [dragging, setDragging] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<SiteLocale | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [notice, setNotice] = useState<string | null>(null);
    const input = useRef<HTMLInputElement>(null);
    const selectionRun = useRef(0);
    const busy = !!pending || checking;
    const selectedName = languageName(selected);
    const current = content.files[selected];

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

    function focusLocale(locale: SiteLocale) {
        setSelected(locale);
        setConfirmDelete(null);
        setError(null);
        setNotice(null);
    }

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
            setConfirmDelete(null);
        } catch (error) {
            setError(error instanceof Error ? error.message : "Could not read this file.");
        } finally {
            if (selectionRun.current === run) setChecking(false);
        }
    }

    async function mutate(method: "POST" | "DELETE", locale: SiteLocale) {
        if (busy || (method === "POST" && !draft)) return;
        setPending(method === "POST" ? "saving" : "deleting");
        setError(null);
        setNotice(null);
        const body = new FormData();
        body.set("locale", locale);
        if (draft) body.set("file", draft.file);
        try {
            const response = await fetch(
                method === "POST" ? "/api/cv" : `/api/cv?locale=${encodeURIComponent(locale)}`,
                { method, body: method === "POST" ? body : undefined }
            );
            if (response.redirected)
                throw new Error("Your session expired. Sign in again before saving.");
            const result = await response.json();
            if (!response.ok)
                throw new Error(result.error || "Something went wrong. Please try again.");
            const next = CvContentSchema.parse(result.content);
            setContent(next);
            setDraft(null);
            setConfirmDelete(null);
            const fallback = resolveCv(next, locale);
            setNotice(
                method === "POST"
                    ? `${languageName(locale)} CV saved. Visitors browsing in ${languageName(locale)} now download this file.`
                    : fallback
                      ? `${languageName(locale)} CV deleted. Visitors browsing in ${languageName(locale)} now get the ${languageName(fallback.locale)} CV.`
                      : `${languageName(locale)} CV deleted. The download button will show that CV is unavailable.`
            );
        } catch (error) {
            setError(
                error instanceof Error ? error.message : "Could not connect. Please try again."
            );
        } finally {
            setPending(null);
        }
    }

    const previewUrl = draft?.url ?? (current ? savedUrl(selected, current.id) : null);

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
                    <section className={styles.card} aria-labelledby="cv-documents-title">
                        <div className={styles.cardHeading}>
                            <h2 id="cv-documents-title">
                                <Languages size={18} aria-hidden="true" />
                                CV documents
                            </h2>
                            <span className={styles.badge}>
                                {Object.keys(content.files).length} of {SITE_LOCALES.length}
                            </span>
                        </div>
                        <ul className={styles.languages}>
                            {SITE_LOCALES.map(({ code, label, name }) => {
                                const document = content.files[code];
                                const fallback = document ? null : resolveCv(content, code);
                                const isSelected = selected === code;
                                return (
                                    <li
                                        key={code}
                                        className={cn(
                                            styles.language,
                                            isSelected && styles.languageSelected
                                        )}
                                        aria-label={`${name} CV`}
                                    >
                                        <button
                                            type="button"
                                            className={styles.languageSelect}
                                            aria-label={`Select ${name} CV`}
                                            aria-pressed={isSelected}
                                            aria-controls="cv-preview"
                                            disabled={busy}
                                            onClick={() => focusLocale(code)}
                                        />
                                        <div className={styles.languageHeading}>
                                            <h3>
                                                {name}
                                                <span className={styles.localeCode}>{label}</span>
                                            </h3>
                                            <span
                                                className={cn(
                                                    styles.badge,
                                                    document && styles.published
                                                )}
                                            >
                                                {document ? "Published" : "Not uploaded"}
                                            </span>
                                        </div>
                                        {document ? (
                                            <>
                                                <p className={styles.fileName}>
                                                    {document.fileName}
                                                </p>
                                                <p className={styles.meta}>
                                                    {formatSize(document.size)} · Updated{" "}
                                                    <time dateTime={document.updatedAt}>
                                                        {formatDate(document.updatedAt)}
                                                    </time>
                                                </p>
                                            </>
                                        ) : (
                                            <p className={styles.meta}>
                                                {fallback
                                                    ? `Visitors get the ${languageName(fallback.locale)} CV instead.`
                                                    : "The download button is disabled."}
                                            </p>
                                        )}
                                        {confirmDelete === code && document ? (
                                            <div
                                                className={styles.confirm}
                                                role="group"
                                                aria-label={`Confirm ${name} CV deletion`}
                                            >
                                                <p>
                                                    Delete the {name} CV?{" "}
                                                    {Object.keys(content.files).length > 1
                                                        ? "Visitors browsing in this language will get another uploaded CV."
                                                        : "The download button will stay visible, but disabled until you upload a new CV."}
                                                </p>
                                                <div className={styles.actions}>
                                                    <Button
                                                        variant="danger"
                                                        disabled={busy}
                                                        onClick={() => void mutate("DELETE", code)}
                                                    >
                                                        {pending === "deleting"
                                                            ? "Deleting…"
                                                            : "Delete permanently"}
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        disabled={busy}
                                                        onClick={() => setConfirmDelete(null)}
                                                    >
                                                        Keep CV
                                                    </Button>
                                                </div>
                                            </div>
                                        ) : document ? (
                                            <div className={styles.languageActions}>
                                                <Button
                                                    variant="ghost"
                                                    className={styles.deleteButton}
                                                    aria-label={`Delete ${name} CV`}
                                                    disabled={busy || !!draft}
                                                    onClick={() => {
                                                        focusLocale(code);
                                                        setConfirmDelete(code);
                                                    }}
                                                >
                                                    <Trash2 size={15} aria-hidden="true" />
                                                    Delete
                                                </Button>
                                            </div>
                                        ) : null}
                                    </li>
                                );
                            })}
                        </ul>
                    </section>

                    <section
                        className={styles.card}
                        aria-labelledby="upload-cv-title"
                        aria-busy={busy}
                    >
                        <div className={styles.cardHeading}>
                            <h2 id="upload-cv-title">
                                <Upload size={18} aria-hidden="true" />
                                {current ? `Replace ${selectedName} CV` : "Upload CV"}
                            </h2>
                        </div>
                        <CvLanguageSelect value={selected} disabled={busy} onChange={focusLocale} />
                        <p className={styles.description}>
                            Choose a PDF, check the preview, then save.{" "}
                            {current
                                ? `The current ${selectedName} CV stays available until you save the replacement.`
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
                                    {formatSize(draft.file.size)} · Ready to save as the{" "}
                                    {selectedName} CV
                                </p>
                                <div className={styles.actions}>
                                    <Button
                                        variant="primary"
                                        disabled={busy}
                                        onClick={() => void mutate("POST", selected)}
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

                <section
                    id="cv-preview"
                    className={styles.preview}
                    aria-labelledby="cv-preview-title"
                >
                    <div className={styles.previewHeading}>
                        <div>
                            <h2 id="cv-preview-title">
                                {draft
                                    ? `${selectedName} CV · preview before saving`
                                    : `${selectedName} CV`}
                            </h2>
                            <p>
                                {draft
                                    ? draft.file.name
                                    : (current?.fileName ?? "No PDF uploaded for this language")}
                            </p>
                        </div>
                        {previewUrl && (
                            <div className={styles.actions}>
                                <a
                                    className={styles.link}
                                    href={previewUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    <ExternalLink size={16} aria-hidden="true" />
                                    <span>Open in new tab</span>
                                </a>
                                {!draft && current && (
                                    <a
                                        className={styles.link}
                                        href={`${previewUrl}&download=1`}
                                        download
                                    >
                                        <Download size={16} aria-hidden="true" />
                                        <span>Download</span>
                                    </a>
                                )}
                            </div>
                        )}
                    </div>
                    {previewUrl ? (
                        <>
                            <PdfPreview
                                key={previewUrl}
                                label={
                                    draft
                                        ? `Selected ${selectedName} CV preview`
                                        : `Saved ${selectedName} CV preview`
                                }
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
                                Select a PDF for the {selectedName} CV to check its layout and
                                content before publishing it.
                            </p>
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
