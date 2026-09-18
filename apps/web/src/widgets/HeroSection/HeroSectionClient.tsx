"use client";

import Image from "next/image";
import { m, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
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

const [NAME_FIRST, ...nameRest] = siteConfig.name.split(" ");
const NAME_LAST = nameRest.join(" ");

const TITLE_TRAVEL_END = 1;
const IMAGE_TRAVEL_END = 1;
const TITLE_EXIT_SAFETY_MARGIN_MIN = 24;
const TITLE_EXIT_SAFETY_MARGIN_RATIO = 0.04;
const CAMERA_SETTLE_END = 0.96;
const CAMERA_PROGRESS_INPUT = [0, 0.32, 0.62, 0.86, 1];
const CAMERA_PROGRESS_OUTPUT = [0, 0.24, 0.52, 0.8, 1];
const STATS_PICKUP_PROGRESS = 0;
const SELECTED_ENTRY_VIEWPORT_RATIO = 1.14;
const SELECTED_FOCUS_DRIFT = 0;

const FLOATER_LAYER_CLASSES = [
    styles.floaterBack,
    styles.floaterBack,
    styles.floaterFront,
    styles.floaterFront,
];

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
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

function useCompactViewport() {
    const [isCompact, setIsCompact] = useState(false);

    useEffect(() => {
        const media = window.matchMedia("(max-width: 767px)");
        const update = () => setIsCompact(media.matches);

        update();
        media.addEventListener("change", update);

        return () => media.removeEventListener("change", update);
    }, []);

    return isCompact;
}

function useNarrowViewport() {
    const [isNarrow, setIsNarrow] = useState(false);

    useEffect(() => {
        const media = window.matchMedia("(max-width: 1023px)");
        const update = () => setIsNarrow(media.matches);

        update();
        media.addEventListener("change", update);

        return () => media.removeEventListener("change", update);
    }, []);

    return isNarrow;
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
    const reduced = useReducedMotion();
    const isCompact = useCompactViewport();
    const isNarrow = useNarrowViewport();
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
    const { progress: depthProgress } = useHeroDepthHandoffProgress();
    const {
        progress: statsSelectedProgress,
        rawProgress: statsSelectedRawProgress,
        focusProgress: selectedFocusProgress,
        handoffProgress: selectedHandoffProgress,
        handoffRunway: selectedHandoffRunway,
    } = useStatsSelectedProgress();

    const { scrollYProgress } = useScroll({
        target: scrollTrackRef,
        offset: ["start start", "end end"],
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

        const measure = () => {
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

        const rafId = requestAnimationFrame(measure);
        const resizeObserver =
            typeof ResizeObserver === "undefined"
                ? null
                : new ResizeObserver(() => {
                      measure();
                  });

        resizeObserver?.observe(nameFirst);
        resizeObserver?.observe(nameLast);
        void document.fonts?.ready.then(measure);
        window.addEventListener("resize", measure);

        return () => {
            cancelAnimationFrame(rafId);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [reduced]);

    useLayoutEffect(() => {
        const selectedGeometryProbe = selectedGeometryProbeRef.current;
        const selectedMotionLayer = selectedMotionLayerRef.current;
        const header = document.querySelector("header");

        if (!selectedGeometryProbe || !selectedMotionLayer) {
            return;
        }

        const measure = () => {
            const viewportHeight = window.innerHeight;
            const headerHeight = header?.getBoundingClientRect().height ?? 0;
            const selectedFinalOffset = Math.abs(
                Number.parseFloat(getComputedStyle(selectedGeometryProbe).marginTop) || 0
            );
            const selectedHeight = selectedMotionLayer.getBoundingClientRect().height;
            const headerClearance = headerHeight + Math.max(viewportHeight * 0.04, 28) + 36;

            setChoreographyMetrics((prev) =>
                Math.abs(prev.viewportHeight - viewportHeight) < 0.5 &&
                Math.abs(prev.headerClearance - headerClearance) < 0.5 &&
                Math.abs(prev.selectedFinalOffset - selectedFinalOffset) < 0.5 &&
                Math.abs(prev.selectedHeight - selectedHeight) < 0.5
                    ? prev
                    : { viewportHeight, headerClearance, selectedFinalOffset, selectedHeight }
            );
        };

        const resizeObserver =
            typeof ResizeObserver === "undefined" ? null : new ResizeObserver(measure);
        const frame = requestAnimationFrame(measure);

        resizeObserver?.observe(selectedGeometryProbe);
        resizeObserver?.observe(selectedMotionLayer);
        if (header instanceof HTMLElement) {
            resizeObserver?.observe(header);
        }
        window.addEventListener("resize", measure);

        return () => {
            cancelAnimationFrame(frame);
            resizeObserver?.disconnect();
            window.removeEventListener("resize", measure);
        };
    }, [selectedWork]);

    // Structural parallax is tied directly to document progress. A spring here
    // made the scene continue moving after input stopped, then catch up abruptly.
    const parallaxProgress = scrollYProgress;

    const heroOpacity = useTransform(
        scrollYProgress,
        reduced ? [0, 1] : [0, HERO_DEPTH_TRANSITION_START, 1],
        reduced ? [1, 0] : [1, 1, 0]
    );
    const heroPointerEvents = useTransform(() =>
        depthProgress.get() >= (reduced ? 0.995 : 0.5) ? "none" : "auto"
    );
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

    const depthStartZ = reduced ? 0 : isCompact ? 220 : 420;
    const depthMidZ = reduced ? 0 : isCompact ? 92 : 172;
    const depthStartScale = reduced ? 1 : isCompact ? 2.15 : 2.9;
    const depthNearScale = reduced ? 1 : isCompact ? 1.72 : 2.08;
    const depthMidScale = reduced ? 1 : isCompact ? 1.38 : 1.52;
    const depthLateScale = reduced ? 1 : isCompact ? 1.12 : 1.16;
    const depthStartY = reduced ? 0 : isCompact ? -240 : -430;
    const depthMidY = reduced ? 0 : isCompact ? -96 : -170;
    const statsOpacity = useTransform(
        cameraProgress,
        reduced ? [0, 1] : [0, 0.04, 0.1, 0.22, 0.42, 1],
        reduced ? [0, 1] : [0, 0.18, 0.52, 0.82, 1, 1]
    );
    const statsZ = useTransform(
        cameraProgress,
        [0, 0.52, CAMERA_SETTLE_END, 1],
        [depthStartZ, depthMidZ, 0, 0]
    );
    const statsScale = useTransform(
        cameraProgress,
        [0, 0.24, 0.52, 0.8, CAMERA_SETTLE_END, 1],
        [depthStartScale, depthNearScale, depthMidScale, depthLateScale, 1, 1]
    );
    const statsY = useTransform(
        cameraProgress,
        [0, 0.55, CAMERA_SETTLE_END, 1],
        [depthStartY, depthMidY, 0, 0]
    );
    const statsPointerEvents = useTransform(() =>
        cameraProgress.get() <= (reduced ? 0.02 : 0.08) ? "none" : "auto"
    );
    const selectedEntryProgress = useTransform(statsSelectedRawProgress, (latest) => {
        return clamp01(latest);
    });
    const statsLiftY = useTransform(statsSelectedProgress, (latest) => {
        const liftProgress = clamp01(
            (latest - STATS_PICKUP_PROGRESS) / (1 - STATS_PICKUP_PROGRESS)
        );
        const finalLift = Math.max(
            choreographyMetrics.viewportHeight / 2 - choreographyMetrics.headerClearance,
            0
        );

        return -finalLift * liftProgress;
    });
    const selectedMotionY = useTransform(selectedEntryProgress, (latest) => {
        const viewportHeight = choreographyMetrics.viewportHeight;
        const initialTop = viewportHeight * SELECTED_ENTRY_VIEWPORT_RATIO;
        const finalTop = viewportHeight - choreographyMetrics.selectedFinalOffset;

        return initialTop + (finalTop - initialTop) * clamp01(latest);
    });
    const selectedFlowAdjustment =
        choreographyMetrics.selectedHeight - choreographyMetrics.selectedFinalOffset;
    const selectedFocusDriftY = useTransform(
        selectedFocusProgress,
        (latest) =>
            -(isCompact ? SELECTED_FOCUS_DRIFT * 0.66 : SELECTED_FOCUS_DRIFT) * smoothstep(latest)
    );
    const selectedHandoffY = useTransform(
        selectedHandoffProgress,
        (latest) => -(selectedHandoffRunway / 2) * latest * latest
    );
    const selectedLayerY = useTransform(
        () => selectedMotionY.get() + selectedFocusDriftY.get() + selectedHandoffY.get()
    );

    const nameFirstX = useTransform(
        scrollYProgress,
        [0, TITLE_TRAVEL_END, 1],
        [0, titleExitX.first, titleExitX.first]
    );
    const nameLastX = useTransform(
        scrollYProgress,
        [0, TITLE_TRAVEL_END, 1],
        [0, titleExitX.last, titleExitX.last]
    );
    const floaterOneY = useTransform(
        parallaxProgress,
        [0, IMAGE_TRAVEL_END, 1],
        reduced ? ["0vh", "0vh", "0vh"] : ["0vh", "-36vh", "-36vh"]
    );
    const floaterTwoY = useTransform(
        parallaxProgress,
        [0, IMAGE_TRAVEL_END, 1],
        reduced
            ? ["0vh", "0vh", "0vh"]
            : isNarrow
              ? ["0vh", "-22vh", "-22vh"]
              : ["2vh", "-48vh", "-48vh"]
    );
    const floaterThreeY = useTransform(
        parallaxProgress,
        [0, IMAGE_TRAVEL_END, 1],
        reduced
            ? ["0vh", "0vh", "0vh"]
            : isNarrow
              ? ["0vh", "-24vh", "-24vh"]
              : ["12vh", "-32vh", "-32vh"]
    );
    const floaterFourY = useTransform(
        parallaxProgress,
        [0, IMAGE_TRAVEL_END, 1],
        reduced ? ["0vh", "0vh", "0vh"] : ["16vh", "-58vh", "-58vh"]
    );
    const introY = useTransform(
        scrollYProgress,
        [0, IMAGE_TRAVEL_END, 1],
        reduced ? ["0vh", "0vh", "0vh"] : ["0vh", "-14vh", "-14vh"]
    );
    const availabilityY = useTransform(
        scrollYProgress,
        [0, IMAGE_TRAVEL_END, 1],
        reduced ? ["0vh", "0vh", "0vh"] : ["0vh", "-10vh", "-10vh"]
    );

    const floaterYValues = [floaterOneY, floaterTwoY, floaterThreeY, floaterFourY];
    const [pinkFloater, crustyFloater, ogofoliFloater, olvaFloater] = hero.floatingImages;
    const titleFloaters = [pinkFloater, crustyFloater].filter(
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

                <div className={styles.stage}>
                    <m.div
                        className={styles.heroLayer}
                        style={{ opacity: heroOpacity, pointerEvents: heroPointerEvents }}
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
                                                        index === 0
                                                            ? styles.floaterVariantA
                                                            : styles.floaterVariantB,
                                                        FLOATER_LAYER_CLASSES[index] ??
                                                            styles.floaterFront
                                                    )}
                                                    variants={safeFadeIn}
                                                    style={{ y: floaterYValues[index] }}
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
                                            style={{ y: floaterThreeY }}
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
                                            style={{ y: floaterFourY }}
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
                        <m.div className={styles.statsLiftLayer} style={{ y: statsLiftY }}>
                            <m.div
                                className={styles.statsDepthPlane}
                                transformTemplate={(_, generatedTransform) =>
                                    generatedTransform === "none"
                                        ? "translate3d(0px, 0px, 0px) scale(1)"
                                        : generatedTransform
                                }
                                style={{
                                    opacity: statsOpacity,
                                    z: statsZ,
                                    scale: statsScale,
                                    y: statsY,
                                    pointerEvents: statsPointerEvents,
                                }}
                            >
                                <StatsSection
                                    as="div"
                                    items={stats}
                                    depthProgress={cameraProgress}
                                    className={styles.statsSection}
                                />
                            </m.div>
                        </m.div>
                    </div>
                    {selectedWork && (
                        <m.div
                            ref={selectedMotionLayerRef}
                            className={styles.selectedMotionLayer}
                            style={{ y: selectedLayerY }}
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
