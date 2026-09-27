"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
    getDocument,
    GlobalWorkerOptions,
    version,
    type PDFDocumentProxy,
    type RenderTask,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import { Button } from "@/shared/ui/Button";
import styles from "./CvManager.module.css";

const assets = `/api/cv/preview-assets/${version}`;
GlobalWorkerOptions.workerSrc = `${assets}/legacy/build/pdf.worker.min.mjs`;

export default function PdfPreview({ url, label }: { url: string; label: string }) {
    const container = useRef<HTMLDivElement>(null);
    const [pdf, setPdf] = useState<PDFDocumentProxy | null>(null);
    const [width, setWidth] = useState(0);
    const [pageNumber, setPageNumber] = useState(1);
    const [renderedPage, setRenderedPage] = useState(0);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let active = true;
        const task = getDocument({
            url,
            cMapUrl: `${assets}/cmaps/`,
            cMapPacked: true,
            standardFontDataUrl: `${assets}/standard_fonts/`,
            wasmUrl: `${assets}/wasm/`,
        });
        void task.promise.then(
            (document) => {
                if (active) setPdf(document);
            },
            (reason: { name?: string }) => {
                if (active)
                    setError(
                        reason.name === "PasswordException"
                            ? "This PDF is password protected. Export an unlocked copy to preview it."
                            : "This PDF could not be previewed. Try opening it in a new tab or exporting it again."
                    );
            }
        );
        return () => {
            active = false;
            void task.destroy().catch(() => {});
        };
    }, [url]);

    useEffect(() => {
        if (!container.current) return;
        const observer = new ResizeObserver(([entry]) =>
            setWidth(Math.floor(entry.contentRect.width))
        );
        observer.observe(container.current);
        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (!pdf || !width) return;
        let active = true;
        let renderTask: RenderTask | undefined;
        void (async () => {
            try {
                const page = await pdf.getPage(pageNumber);
                if (!active) return;
                const original = page.getViewport({ scale: 1 });
                const viewport = page.getViewport({ scale: Math.min(width, 900) / original.width });
                const density = Math.min(
                    window.devicePixelRatio || 1,
                    2,
                    Math.sqrt(4_000_000 / (viewport.width * viewport.height))
                );
                // One page at a time, rendered offscreen before replacing the
                // previous canvas. Cap pixels to avoid excessive mobile memory.
                const canvas = document.createElement("canvas");
                canvas.width = Math.floor(viewport.width * density);
                canvas.height = Math.floor(viewport.height * density);
                canvas.style.width = `${viewport.width}px`;
                canvas.style.height = `${viewport.height}px`;
                canvas.setAttribute("role", "img");
                canvas.setAttribute(
                    "aria-label",
                    `${label}, page ${pageNumber} of ${pdf.numPages}`
                );
                renderTask = page.render({
                    canvas,
                    viewport,
                    transform: [density, 0, 0, density, 0, 0],
                });
                await renderTask.promise;
                if (!active) return;
                container.current?.replaceChildren(canvas);
                setRenderedPage(pageNumber);
                page.cleanup();
            } catch {
                if (active)
                    setError(
                        "Could not render this page. Use “Open in new tab” to view the original PDF."
                    );
            }
        })();
        return () => {
            active = false;
            renderTask?.cancel();
        };
    }, [pdf, width, pageNumber, label]);

    return (
        <div className={styles.pdfViewer}>
            <div className={styles.pdfToolbar}>
                <Button
                    aria-label="Previous PDF page"
                    disabled={!pdf || pageNumber === 1}
                    onClick={() => setPageNumber((page) => page - 1)}
                >
                    <ChevronLeft size={16} aria-hidden="true" />
                </Button>
                <span aria-live="polite">
                    {pdf ? `Page ${pageNumber} of ${pdf.numPages}` : "Loading PDF…"}
                </span>
                <Button
                    aria-label="Next PDF page"
                    disabled={!pdf || pageNumber === pdf.numPages}
                    onClick={() => setPageNumber((page) => page + 1)}
                >
                    <ChevronRight size={16} aria-hidden="true" />
                </Button>
            </div>
            {error ? (
                <p className={styles.previewError} role="alert">
                    {error}
                </p>
            ) : (
                <div className={styles.pdfViewport}>
                    {renderedPage !== pageNumber && (
                        <p className={styles.previewHint} role="status">
                            Preparing preview…
                        </p>
                    )}
                    <div
                        className={styles.pdfPage}
                        ref={container}
                        aria-busy={renderedPage !== pageNumber}
                    />
                </div>
            )}
        </div>
    );
}
