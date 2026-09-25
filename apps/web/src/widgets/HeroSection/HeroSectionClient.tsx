"use client";

import Image from "next/image";
import { cancelFrame, frame, m, useMotionValue, useTransform } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { HeroContent, Social, StatItem } from "@avrash/content-schema";
import {
    HERO_DEPTH_TRANSITION_START,
    STATS_CAMERA_MOTION_END,
} from "@/shared/config/heroDepthHandoff";
import { siteConfig } from "@/shared/config/site.config";
import {
    useHeroDepthHandoffProgress,
    useMotionVariants,
    useStatsSelectedProgress,
} from "@/shared/hooks";
import { cn } from "@/shared/lib/cn";
import { fadeIn } from "@/shared/lib/motion/fade-in";
import { createViewportResizeGuard } from "@/shared/lib/motion/mobileViewport";
import { staggerContainer } from "@/shared/lib/motion/stagger";
import { StatsSelectedChoreographyProvider } from "@/shared/lib/motion/StatsSelectedChoreographyContext";
import { usePreloader } from "@/shared/providers";
import { Button, Container, GlassSurface, NoiseLayer, Section } from "@/shared/ui";
import { StatsSection } from "@/widgets/StatsSection";
import {
    SelectedWorkSection,
    type SelectedWorkSectionProps,
} from "@/widgets/SelectedWorkSection/SelectedWorkSection";
import styles from "./HeroSection.module.scss";
import { useHeroScroll } from "./useHeroScroll";
import { useStatsCamera } from "./useStatsCamera";
import { useReducedMotionPreference } from "@/shared/hooks/useReducedMotionPreference";
import { useMediaQuery } from "@/shared/hooks/useMediaQuery";
import { useMotionInert } from "@/shared/hooks/useMotionInert";

const [NAME_FIRST, ...nameRest] = siteConfig.name.split(" ");
const NAME_LAST = nameRest.join(" ");

const TITLE_TRAVEL_END = 1;
const IMAGE_TRAVEL_END = 1;
const TITLE_EXIT_SAFETY_MARGIN_MIN = 24;
const TITLE_EXIT_SAFETY_MARGIN_RATIO = 0.04;
const CAMERA_PROGRESS_INPUT = [0, 0.32, 0.62, 0.86, 1];
const CAMERA_PROGRESS_OUTPUT = [0, 0.24, 0.52, 0.8, 1];
const STATS_PICKUP_PROGRESS = 0;
const SELECTED_ENTRY_VIEWPORT_RATIO = 1.14;
const STATS_SELECTED_GAP = 24;
const SELECTED_FOCUS_DRIFT = 0;
const HERO_OPACITY_CEILING = 0.9999;

const FLOATER_LAYER_CLASSES = [
    styles.floaterBack,
    styles.floaterBack,
    styles.floaterFront,
    styles.floaterFront,
];

const TITLE_FLOATER_VARIANT_CLASSES = [
    styles.floaterVariantA,
    styles.floaterVariantB,
    styles.floaterVariantC,
];

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

function keepTransformLayer(_: unknown, generated: string) {
    return generated || "translateY(0px)";
}

function smoothstep(value: number) {
    const clamped = clamp01(value);
    return clamped * clamped * (3 - 2 * clamped);
}

function readTranslateX(node: HTMLElement) {
    const { transform } = getComputedStyle(node);

    if (!transform || transform === "none") {
        return 0;
    }

    if (typeof DOMMatrixReadOnly !== "undefined") {
        return new DOMMatrixReadOnly(transform).m41;
    }

    const values = transform.match(/matrix(?:3d)?\((.+)\)/)?.[1]?.split(",") ?? [];
    return Number(values[values.length === 16 ? 12 : 4] ?? 0);
}

interface HeroSectionClientProps {
    hero: HeroContent;
    socials: Social[];
    stats: StatItem[];
    selectedWork?: SelectedWorkSectionProps;
}

export function HeroSectionClient({ hero, socials, stats, selectedWork }: HeroSectionClientProps) {
    const t = useTranslations("hero");
    const locale = useLocale();
    const safeStagger = useMotionVariants(staggerContainer);
    const safeFadeIn = useMotionVariants(fadeIn);
    const { isReady } = usePreloader();
    const reduced = useReducedMotionPreference();
    const isCompact = useMediaQuery("(max-width: 767px)");
    const isNarrow = useMediaQuery("(max-width: 1023px)");
    const isTouch = useMediaQuery("(hover: none) and (pointer: coarse)");
    const stageRef = useRef<HTMLDivElement>(null);
    const heroLayerRef = useRef<HTMLDivElement>(null);
    const statsDepthPlaneRef = useRef<HTMLDivElement>(null);
    const scrollTrackRef = useRef<HTMLDivElement>(null);
    const nameFirstRef = useRef<HTMLSpanElement>(null);
    const nameLastRef = useRef<HTMLSpanElement>(null);
    const selectedGeometryProbeRef = useRef<HTMLDivElement>(null);
    const selectedMotionLayerRef = useRef<HTMLDivElement>(null);
    const [titleExitX, setTitleExitX] = useState({ first: -320, last: 320 });
    const [choreographyMetrics, setChoreographyMetrics] = useState({
        viewportHeight: 900,
        headerClearance: 144,
        selectedFinalOffset: 560,
        selectedHeight: 624,
    });
    const { scrollY, scrollYProgress } = useHeroScroll(scrollTrackRef, stageRef);
    const { progress: depthProgress } = useHeroDepthHandoffProgress(scrollY);
    const {
        progress: statsSelectedProgress,
        rawProgress: statsSelectedRawProgress,
        focusProgress: selectedFocusProgress,
        handoffProgress: selectedHandoffProgress,
        handoffRunway: selectedHandoffRunway,
    } = useStatsSelectedProgress(scrollY);
    const motionConfig = useMotionValue({
        reduced: Boolean(reduced),
        isCompact,
        isNarrow,
        titleExitX,
        choreographyMetrics,
        selectedHandoffRunway,
    });

    useLayoutEffect(() => {
        if (reduced) {
            const rafId = requestAnimationFrame(() => setTitleExitX({ first: 0, last: 0 }));
            return () => cancelAnimationFrame(rafId);
        }

        const nameFirst = nameFirstRef.current;
        const nameLast = nameLastRef.current;

        if (!nameFirst || !nameLast) {
            return;
        }

        let disposed = false;
        let measureFrame = 0;
        const shouldMeasureViewportResize = createViewportResizeGuard();

        const measure = () => {
            measureFrame = 0;
            if (disposed) return;

            const firstX = readTranslateX(nameFirst);
            const lastX = readTranslateX(nameLast);
            const firstRect = nameFirst.getBoundingClientRect();
            const lastRect = nameLast.getBoundingClientRect();
            const firstBaseLeft = firstRect.left - firstX;
            const lastBaseLeft = lastRect.left - lastX;
            const safetyMargin = Math.max(
                window.innerWidth * TITLE_EXIT_SAFETY_MARGIN_RATIO,
                TITLE_EXIT_SAFETY_MARGIN_MIN
            );
            const nextExitX = {
                first: -(firstBaseLeft + firstRect.width + safetyMargin),
                last: window.innerWidth - lastBaseLeft + safetyMargin,
            };

            setTitleExitX((prev) =>
                Math.abs(prev.first - nextExitX.first) < 0.5 &&
                Math.abs(prev.last - nextExitX.last) < 0.5
                    ? prev
                    : nextExitX
            );
        };

        const scheduleMeasure = () => {
            if (measureFrame || disposed) return;
            measureFrame = requestAnimationFrame(measure);
        };

        const handleResize = () => {
            if (shouldMeasureViewportResize()) scheduleMeasure();
        };

        const resizeObserver =
            typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);

        resizeObserver?.observe(nameFirst);
        resizeObserver?.observe(nameLast);
        scheduleMeasure();
        void document.fonts?.ready.then(scheduleMeasure);
        window.addEventListener("resize", handleResize);

        return () => {
            disposed = true;
            cancelAnimationFrame(measureFrame);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", handleResize);
        };
    }, [reduced]);

    useLayoutEffect(() => {
        const selectedGeometryProbe = selectedGeometryProbeRef.current;
        const selectedMotionLayer = selectedMotionLayerRef.current;
        const stage = stageRef.current;
        const header = document.querySelector("header");
        const statsSlot = statsDepthPlaneRef.current?.parentElement;
        const statsLiftLayer = statsSlot?.closest<HTMLElement>("[data-stats-camera-stage]");

        if (!selectedGeometryProbe || !selectedMotionLayer || !stage) {
            return;
        }

        let disposed = false;
        const shouldMeasureViewportResize = createViewportResizeGuard();

        const measure = () => {
            if (disposed) return;
            // The sticky scene uses 100svh. Reading that same box keeps the
            // choreography stable when mobile browser chrome changes innerHeight.
            const viewportHeight = stage.getBoundingClientRect().height;
            const headerHeight = header?.getBoundingClientRect().height ?? 0;
            const preferredSelectedOffset = Math.abs(
                Number.parseFloat(getComputedStyle(selectedGeometryProbe).marginTop) || 0
            );
            const selectedHeight = selectedMotionLayer.getBoundingClientRect().height;
            const headerClearance = headerHeight + Math.max(viewportHeight * 0.04, 28) + 36;
            const finalStatsLift = Math.max(viewportHeight / 2 - headerClearance, 0);
            // The slot keeps the grid's unscaled layout size. Subtract its moving
            // parent's top so measuring during a reverse scroll gives the same
            // resting geometry. At handoff the camera has settled to scale(1).
            const statsBottom =
                statsSlot && statsLiftLayer
                    ? statsSlot.getBoundingClientRect().bottom -
                      statsLiftLayer.getBoundingClientRect().top -
                      finalStatsLift
                    : 0;
            const selectedFinalOffset = Math.min(
                preferredSelectedOffset,
                viewportHeight - statsBottom - STATS_SELECTED_GAP
            );

            setChoreographyMetrics((prev) =>
                Math.abs(prev.viewportHeight - viewportHeight) < 0.5 &&
                Math.abs(prev.headerClearance - headerClearance) < 0.5 &&
                Math.abs(prev.selectedFinalOffset - selectedFinalOffset) < 0.5 &&
                Math.abs(prev.selectedHeight - selectedHeight) < 0.5
                    ? prev
                    : { viewportHeight, headerClearance, selectedFinalOffset, selectedHeight }
            );
        };

        const scheduleMeasure = () => {
            if (!disposed) frame.read(measure);
        };

        const handleResize = () => {
            if (shouldMeasureViewportResize()) scheduleMeasure();
        };

        const resizeObserver =
            typeof ResizeObserver === "undefined" ? null : new ResizeObserver(scheduleMeasure);

        resizeObserver?.observe(selectedGeometryProbe);
        resizeObserver?.observe(selectedMotionLayer);
        resizeObserver?.observe(stage);
        if (statsSlot) resizeObserver?.observe(statsSlot);
        if (header instanceof HTMLElement) {
            resizeObserver?.observe(header);
        }
        scheduleMeasure();
        void document.fonts?.ready.then(scheduleMeasure);
        window.addEventListener("resize", handleResize);

        return () => {
            disposed = true;
            cancelFrame(measure);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", handleResize);
        };
    }, [selectedWork]);

    // Structural parallax is tied directly to document progress. A spring here
    // made the scene continue moving after input stopped, then catch up abruptly.
    const parallaxProgress = scrollYProgress;

    const heroOpacity = useTransform(() => {
        const latest = scrollYProgress.get();
        if (motionConfig.get().reduced) return Math.min(1 - clamp01(latest), HERO_OPACITY_CEILING);
        if (latest <= HERO_DEPTH_TRANSITION_START) return HERO_OPACITY_CEILING;

        return Math.min(
            1 - clamp01((latest - HERO_DEPTH_TRANSITION_START) / (1 - HERO_DEPTH_TRANSITION_START)),
            HERO_OPACITY_CEILING
        );
    });
    const heroPointerEvents = useTransform(() =>
        depthProgress.get() >= (motionConfig.get().reduced ? 0.995 : 0.5) ? "none" : "auto"
    );
    const heroInert = useTransform(heroOpacity, (opacity) => opacity === 0);
    useMotionInert(heroLayerRef, heroInert, heroPointerEvents);
    const statsCameraProgress = useTransform(
        depthProgress,
        [0, STATS_CAMERA_MOTION_END, 1],
        [0, 1, 1]
    );
    const cameraProgress = useTransform(
        statsCameraProgress,
        CAMERA_PROGRESS_INPUT,
        CAMERA_PROGRESS_OUTPUT
    );

    useStatsCamera(statsDepthPlaneRef, cameraProgress, {
        compact: isCompact,
        reduced: Boolean(reduced),
        integratedReveal: isTouch,
    });
    const statsInert = useTransform(cameraProgress, (progress) => progress === 0);
    const statsPointerEvents = useTransform(() =>
        cameraProgress.get() <= (motionConfig.get().reduced ? 0.02 : 0.08) ? "none" : "auto"
    );
    useMotionInert(statsDepthPlaneRef, statsInert, statsPointerEvents);
    const selectedEntryProgress = useTransform(statsSelectedRawProgress, (latest) => {
        return clamp01(latest);
    });
    const statsLiftY = useTransform(() => {
        const latest = statsSelectedProgress.get();
        const { choreographyMetrics: metrics } = motionConfig.get();
        const liftProgress = clamp01(
            (latest - STATS_PICKUP_PROGRESS) / (1 - STATS_PICKUP_PROGRESS)
        );
        const finalLift = Math.max(metrics.viewportHeight / 2 - metrics.headerClearance, 0);

        return -finalLift * liftProgress;
    });
    const selectedMotionY = useTransform(() => {
        const latest = selectedEntryProgress.get();
        const { choreographyMetrics: metrics } = motionConfig.get();
        const viewportHeight = metrics.viewportHeight;
        const initialTop = viewportHeight * SELECTED_ENTRY_VIEWPORT_RATIO;
        const finalTop = viewportHeight - metrics.selectedFinalOffset;

        return initialTop + (finalTop - initialTop) * clamp01(latest);
    });
    const selectedFlowAdjustment =
        choreographyMetrics.selectedHeight - choreographyMetrics.selectedFinalOffset;
    const selectedFocusDriftY = useTransform(() => {
        const latest = selectedFocusProgress.get();
        return (
            -(motionConfig.get().isCompact ? SELECTED_FOCUS_DRIFT * 0.66 : SELECTED_FOCUS_DRIFT) *
            smoothstep(latest)
        );
    });
    const selectedHandoffY = useTransform(() => {
        const latest = selectedHandoffProgress.get();
        return -(motionConfig.get().selectedHandoffRunway / 2) * latest * latest;
    });
    const selectedLayerY = useTransform(
        () => selectedMotionY.get() + selectedFocusDriftY.get() + selectedHandoffY.get()
    );

    const nameFirstX = useTransform(
        () =>
            motionConfig.get().titleExitX.first * clamp01(scrollYProgress.get() / TITLE_TRAVEL_END)
    );
    const nameLastX = useTransform(
        () => motionConfig.get().titleExitX.last * clamp01(scrollYProgress.get() / TITLE_TRAVEL_END)
    );
    const floaterOneY = useTransform(() => {
        const latest = parallaxProgress.get();
        const { reduced: prefersReduced, choreographyMetrics: metrics } = motionConfig.get();
        return prefersReduced
            ? 0
            : -metrics.viewportHeight * 0.36 * clamp01(latest / IMAGE_TRAVEL_END);
    });
    const floaterTwoY = useTransform(() => {
        const latest = parallaxProgress.get();
        const {
            reduced: prefersReduced,
            isNarrow: narrow,
            choreographyMetrics: metrics,
        } = motionConfig.get();
        if (prefersReduced) return 0;

        const progress = clamp01(latest / IMAGE_TRAVEL_END);
        const start = narrow ? 0 : metrics.viewportHeight * 0.02;
        const end = metrics.viewportHeight * (narrow ? -0.22 : -0.48);
        return start + (end - start) * progress;
    });
    const floaterThreeY = useTransform(() => {
        const latest = parallaxProgress.get();
        const {
            reduced: prefersReduced,
            isNarrow: narrow,
            choreographyMetrics: metrics,
        } = motionConfig.get();
        if (prefersReduced) return 0;

        const progress = clamp01(latest / IMAGE_TRAVEL_END);
        const start = metrics.viewportHeight * (narrow ? 0 : 0.12);
        const end = metrics.viewportHeight * (narrow ? -0.24 : -0.32);
        return start + (end - start) * progress;
    });
    const floaterFourY = useTransform(() => {
        const latest = parallaxProgress.get();
        const { reduced: prefersReduced, choreographyMetrics: metrics } = motionConfig.get();
        if (prefersReduced) return 0;

        const progress = clamp01(latest / IMAGE_TRAVEL_END);
        const start = metrics.viewportHeight * 0.16;
        const end = metrics.viewportHeight * -0.58;
        return start + (end - start) * progress;
    });
    const introY = useTransform(() => {
        const latest = scrollYProgress.get();
        const { reduced: prefersReduced, choreographyMetrics: metrics } = motionConfig.get();
        return prefersReduced
            ? 0
            : -metrics.viewportHeight * 0.14 * clamp01(latest / IMAGE_TRAVEL_END);
    });
    const availabilityY = useTransform(() => {
        const latest = scrollYProgress.get();
        const { reduced: prefersReduced, choreographyMetrics: metrics } = motionConfig.get();
        return prefersReduced
            ? 0
            : -metrics.viewportHeight * 0.1 * clamp01(latest / IMAGE_TRAVEL_END);
    });

    useLayoutEffect(() => {
        motionConfig.set({
            reduced: Boolean(reduced),
            isCompact,
            isNarrow,
            titleExitX,
            choreographyMetrics,
            selectedHandoffRunway,
        });
    }, [
        choreographyMetrics,
        isCompact,
        isNarrow,
        motionConfig,
        reduced,
        selectedHandoffRunway,
        titleExitX,
    ]);

    const floaterYValues = [floaterOneY, floaterTwoY, floaterThreeY, floaterFourY];
    const [pinkFloater, crustyFloater, ogofoliFloater, olvaFloater] = hero.floatingImages;
    const titleFloaters = [pinkFloater, crustyFloater, isCompact ? ogofoliFloater : null].filter(
        (floater): floater is (typeof hero.floatingImages)[number] => Boolean(floater)
    );

    return (
        <Section id="hero" className={styles.hero}>
            <div id="hero-transition-track" className={styles.transitionTrack}>
                <div
                    id="hero-scroll-track"
                    ref={scrollTrackRef}
                    className={styles.scrollTrack}
                    aria-hidden="true"
                />
                <div
                    id="stats-camera-track"
                    className={styles.statsCameraTrack}
                    aria-hidden="true"
                />
                <div
                    id="selected-motion-track"
                    className={styles.selectedMotionTrack}
                    aria-hidden="true"
                />
                <div
                    id="selected-focus-track"
                    className={styles.selectedFocusTrack}
                    aria-hidden="true"
                />
                <div
                    ref={selectedGeometryProbeRef}
                    className={styles.selectedGeometryProbe}
                    aria-hidden="true"
                />

                <div ref={stageRef} id="hero-sticky-stage" className={styles.stage}>
                    <m.div
                        ref={heroLayerRef}
                        className={styles.heroLayer}
                        style={{
                            opacity: heroOpacity,
                        }}
                    >
                        <NoiseLayer />
                        <div className={styles.glow} aria-hidden="true" />
                        <div className={styles.glowSecondary} aria-hidden="true" />

                        <Container className={styles.container}>
                            <m.div
                                className={styles.content}
                                variants={safeStagger}
                                initial="hidden"
                                animate={isReady ? "visible" : "hidden"}
                            >
                                <m.div className={styles.topRow} variants={safeFadeIn}>
                                    <span className={styles.role}>{t("role")}</span>

                                    <div className={styles.socials}>
                                        {socials.map((social) => (
                                            <a
                                                key={social.id}
                                                href={social.link}
                                                className={styles.socialLink}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                aria-label={social.logo.alt ?? social.id}
                                                style={
                                                    {
                                                        "--social-icon": `url(${social.logo.src})`,
                                                    } as CSSProperties
                                                }
                                            >
                                                <span
                                                    className={styles.socialIcon}
                                                    aria-hidden="true"
                                                />
                                            </a>
                                        ))}
                                    </div>
                                </m.div>

                                <div className={styles.titleArea}>
                                    <div className={styles.nameStage}>
                                        <m.div className={styles.nameTrack} variants={safeFadeIn}>
                                            <h1 className={styles.name}>
                                                <m.span
                                                    ref={nameFirstRef}
                                                    className={styles.nameLine}
                                                    style={{ x: nameFirstX }}
                                                    transformTemplate={keepTransformLayer}
                                                >
                                                    {NAME_FIRST}
                                                </m.span>
                                                <m.span
                                                    ref={nameLastRef}
                                                    className={cn(
                                                        styles.nameLine,
                                                        styles.nameLineEnd
                                                    )}
                                                    style={{ x: nameLastX }}
                                                    transformTemplate={keepTransformLayer}
                                                >
                                                    {NAME_LAST}
                                                </m.span>
                                            </h1>
                                        </m.div>
                                    </div>

                                    {(pinkFloater || crustyFloater) && (
                                        <m.div className={styles.titleFloaters} aria-hidden="true">
                                            {titleFloaters.map((floater, index) => (
                                                <m.div
                                                    key={floater.id}
                                                    className={cn(
                                                        styles.floater,
                                                        TITLE_FLOATER_VARIANT_CLASSES[index] ??
                                                            styles.floaterVariantC,
                                                        FLOATER_LAYER_CLASSES[index] ??
                                                            styles.floaterFront
                                                    )}
                                                    variants={safeFadeIn}
                                                    style={{ y: floaterYValues[index] }}
                                                    transformTemplate={keepTransformLayer}
                                                >
                                                    <Image
                                                        src={floater.image.src}
                                                        alt={floater.image.alt ?? ""}
                                                        fill
                                                        className={styles.floaterImage}
                                                        style={{
                                                            objectPosition: `${floater.image.focalPoint?.x ?? 50}% ${floater.image.focalPoint?.y ?? 50}%`,
                                                            transform: `scale(${floater.image.scale ?? 1})`,
                                                            transformOrigin: `${floater.image.focalPoint?.x ?? 50}% ${floater.image.focalPoint?.y ?? 50}%`,
                                                        }}
                                                        sizes="(max-width: 768px) 42vw, 240px"
                                                        draggable={false}
                                                    />
                                                </m.div>
                                            ))}
                                        </m.div>
                                    )}
                                </div>

                                <div className={styles.lowerArea}>
                                    <m.div
                                        className={styles.introCardWrap}
                                        variants={safeFadeIn}
                                        style={{ y: introY }}
                                        transformTemplate={keepTransformLayer}
                                    >
                                        <GlassSurface
                                            as="article"
                                            className={styles.introCard}
                                            contentClassName={styles.introCardContent}
                                            preset="hero"
                                            interactive={false}
                                        >
                                            <div className={styles.introTextCol}>
                                                <p className={styles.description}>
                                                    {hero.description}
                                                </p>

                                                <Button
                                                    as="a"
                                                    href={`/${locale}/contact`}
                                                    variant="primary"
                                                    size="lg"
                                                    className={styles.cta}
                                                >
                                                    {t("cta")}
                                                </Button>
                                            </div>
                                        </GlassSurface>
                                    </m.div>

                                    {ogofoliFloater && (
                                        <m.div
                                            className={cn(
                                                styles.floater,
                                                styles.lowerFloater,
                                                FLOATER_LAYER_CLASSES[2]
                                            )}
                                            variants={safeFadeIn}
                                            style={{ y: isCompact ? 0 : floaterThreeY }}
                                            transformTemplate={keepTransformLayer}
                                            aria-hidden="true"
                                        >
                                            <Image
                                                src={ogofoliFloater.image.src}
                                                alt=""
                                                fill
                                                className={styles.floaterImage}
                                                style={{
                                                    objectPosition: `${ogofoliFloater.image.focalPoint?.x ?? 50}% ${ogofoliFloater.image.focalPoint?.y ?? 50}%`,
                                                    transform: `scale(${ogofoliFloater.image.scale ?? 1})`,
                                                    transformOrigin: `${ogofoliFloater.image.focalPoint?.x ?? 50}% ${ogofoliFloater.image.focalPoint?.y ?? 50}%`,
                                                }}
                                                sizes="(max-width: 1023px) 160px, 240px"
                                                draggable={false}
                                            />
                                        </m.div>
                                    )}

                                    {olvaFloater && (
                                        <m.div
                                            className={cn(
                                                styles.floater,
                                                styles.lowerFloaterSecondary,
                                                FLOATER_LAYER_CLASSES[3]
                                            )}
                                            variants={safeFadeIn}
                                            style={{ y: isNarrow ? 0 : floaterFourY }}
                                            transformTemplate={keepTransformLayer}
                                            aria-hidden="true"
                                        >
                                            <Image
                                                src={olvaFloater.image.src}
                                                alt=""
                                                fill
                                                className={styles.floaterImage}
                                                style={{
                                                    objectPosition: `${olvaFloater.image.focalPoint?.x ?? 50}% ${olvaFloater.image.focalPoint?.y ?? 50}%`,
                                                    transform: `scale(${olvaFloater.image.scale ?? 1})`,
                                                    transformOrigin: `${olvaFloater.image.focalPoint?.x ?? 50}% ${olvaFloater.image.focalPoint?.y ?? 50}%`,
                                                }}
                                                sizes="(max-width: 1023px) 160px, 240px"
                                                draggable={false}
                                            />
                                        </m.div>
                                    )}
                                </div>

                                <div className={styles.metaRow}>
                                    <m.span
                                        className={cn(
                                            styles.availability,
                                            !hero.availableForWork && styles.availabilityOff
                                        )}
                                        variants={safeFadeIn}
                                        style={{ y: availabilityY }}
                                        transformTemplate={keepTransformLayer}
                                    >
                                        <span
                                            className={styles.availabilityDot}
                                            aria-hidden="true"
                                        />
                                        {hero.availableForWork
                                            ? t("availability")
                                            : t("unavailable")}
                                    </m.span>
                                </div>
                            </m.div>
                        </Container>
                    </m.div>

                    <div className={styles.statsViewport}>
                        <m.div
                            className={styles.statsLiftLayer}
                            style={{ y: statsLiftY }}
                            transformTemplate={keepTransformLayer}
                            data-stats-camera-stage
                        >
                            <StatsSection
                                as="div"
                                items={stats}
                                depthProgress={cameraProgress}
                                className={styles.statsSection}
                                cameraRef={statsDepthPlaneRef}
                                cameraClassName={styles.statsDepthPlane}
                                integratedReveal={isTouch}
                            />
                        </m.div>
                    </div>
                    {selectedWork && (
                        <m.div
                            ref={selectedMotionLayerRef}
                            className={styles.selectedMotionLayer}
                            style={{ y: selectedLayerY }}
                            transformTemplate={keepTransformLayer}
                        >
                            <StatsSelectedChoreographyProvider progress={selectedEntryProgress}>
                                <SelectedWorkSection {...selectedWork} />
                            </StatsSelectedChoreographyProvider>
                        </m.div>
                    )}
                </div>
            </div>
            {selectedWork && (
                <div
                    className={styles.selectedFlowReserve}
                    style={{
                        height: Math.max(selectedFlowAdjustment, 0),
                        marginTop: Math.min(selectedFlowAdjustment, 0),
                    }}
                    aria-hidden="true"
                ></div>
            )}
        </Section>
    );
}
