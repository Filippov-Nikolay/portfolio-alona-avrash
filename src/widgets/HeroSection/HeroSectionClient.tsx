"use client";

import Image from "next/image";
import { m, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import type { HeroContent } from "@/entities/hero/model/hero";
import type { Social } from "@/entities/social/model/social";
import type { StatItem } from "@/entities/stat/model/stat";
import {
    HERO_DEPTH_TRANSITION_START,
    STATS_CAMERA_MOTION_END,
} from "@/shared/config/heroDepthHandoff";
import { siteConfig } from "@/shared/config/site.config";
import { useHeroDepthHandoffProgress, useMotionVariants } from "@/shared/hooks";
import { cn } from "@/shared/lib/cn";
import { fadeIn } from "@/shared/lib/motion/fade-in";
import { reveal } from "@/shared/lib/motion/reveal";
import { staggerContainer } from "@/shared/lib/motion/stagger";
import { scrollToElementId } from "@/shared/lib/scroll";
import { usePreloader } from "@/shared/providers";
import { Button, Container, GlassSurface, NoiseLayer, Section } from "@/shared/ui";
import { StatsSection } from "@/widgets/StatsSection";
import styles from "./HeroSection.module.scss";

const [NAME_FIRST, ...nameRest] = siteConfig.name.split(" ");
const NAME_LAST = nameRest.join(" ");

const TITLE_TRAVEL_END = 1;
const IMAGE_TRAVEL_END = 1;
const PARALLAX_BLEND_RATIO = 0.16;
const PARALLAX_START_ASSIST_END = 0.05;
const PARALLAX_END_ASSIST_START = 0.86;
const TITLE_EXIT_SAFETY_MARGIN_MIN = 24;
const TITLE_EXIT_SAFETY_MARGIN_RATIO = 0.04;
const CAMERA_SETTLE_END = 0.96;
const CAMERA_PROGRESS_INPUT = [0, 0.32, 0.62, 0.86, 1];
const CAMERA_PROGRESS_OUTPUT = [0, 0.24, 0.52, 0.8, 1];

const FLOATER_LAYER_CLASSES = [
    styles.floaterBack,
    styles.floaterBack,
    styles.floaterFront,
    styles.floaterFront,
];

function handleCtaClick(e: React.MouseEvent) {
    e.preventDefault();
    scrollToElementId("contact", { offset: 100 });
}

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

function blendProgress(
    raw: number,
    smoothed: number,
    blendRatio: number,
    startAssistEnd: number,
    endAssistStart: number
) {
    const startAssist = 1 - clamp01(raw / startAssistEnd);
    const endAssist = clamp01((raw - endAssistStart) / (1 - endAssistStart));
    const assist = Math.max(startAssist, endAssist);
    const damped = raw + (smoothed - raw) * blendRatio;

    return damped + (raw - damped) * assist;
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

interface HeroSectionClientProps {
    hero: HeroContent;
    socials: Social[];
    stats: StatItem[];
}

export function HeroSectionClient({ hero, socials, stats }: HeroSectionClientProps) {
    const t = useTranslations("hero");
    const safeStagger = useMotionVariants(staggerContainer);
    const safeFadeIn = useMotionVariants(fadeIn);
    const safeReveal = useMotionVariants(reveal);
    const { isReady } = usePreloader();
    const reduced = useReducedMotion();
    const isCompact = useCompactViewport();
    const scrollTrackRef = useRef<HTMLDivElement>(null);
    const nameFirstRef = useRef<HTMLSpanElement>(null);
    const nameLastRef = useRef<HTMLSpanElement>(null);
    const [titleExitX, setTitleExitX] = useState({ first: -320, last: 320 });
    const { progress: depthProgress } = useHeroDepthHandoffProgress();

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

    const parallaxSmoothProgress = useSpring(scrollYProgress, {
        stiffness: reduced ? 1000 : 780,
        damping: reduced ? 100 : 82,
        mass: reduced ? 1 : 0.14,
        restDelta: 0.00015,
    });

    const parallaxProgress = useTransform(() => {
        const raw = scrollYProgress.get();
        const smooth = parallaxSmoothProgress.get();

        return blendProgress(
            raw,
            smooth,
            PARALLAX_BLEND_RATIO,
            PARALLAX_START_ASSIST_END,
            PARALLAX_END_ASSIST_START
        );
    });

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
        reduced ? ["0vh", "0vh", "0vh"] : ["2vh", "-48vh", "-48vh"]
    );
    const floaterThreeY = useTransform(
        parallaxProgress,
        [0, IMAGE_TRAVEL_END, 1],
        reduced ? ["0vh", "0vh", "0vh"] : ["12vh", "-32vh", "-32vh"]
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

    return (
        <Section id="hero" className={styles.hero}>
            <div
                id="hero-scroll-track"
                ref={scrollTrackRef}
                className={styles.scrollTrack}
                aria-hidden="true"
            />

            <div className={styles.stage}>
                <m.div
                    className={styles.heroLayer}
                    style={{ opacity: heroOpacity, pointerEvents: heroPointerEvents }}
                >
                    <NoiseLayer />
                    <div className={styles.glow} aria-hidden="true" />

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
                                            className={cn(styles.nameLine, styles.nameLineEnd)}
                                            style={{ x: nameLastX }}
                                        >
                                            {NAME_LAST}
                                        </m.span>
                                    </h1>
                                </m.div>
                            </div>

                            {hero.floatingImages.length > 0 && (
                                <m.div className={styles.floaters} aria-hidden="true">
                                    {hero.floatingImages.slice(0, 4).map((floater, index) => (
                                        <m.div
                                            key={floater.id}
                                            className={cn(
                                                styles.floater,
                                                FLOATER_LAYER_CLASSES[index] ?? styles.floaterFront
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

                            <m.div className={styles.introRow} variants={safeReveal}>
                                <m.div className={styles.introCardWrap} style={{ y: introY }}>
                                    <GlassSurface
                                        as="article"
                                        className={styles.introCard}
                                        contentClassName={styles.introCardContent}
                                        preset="hero"
                                        interactive={false}
                                    >
                                        <div className={styles.introTextCol}>
                                            <p className={styles.description}>{hero.description}</p>

                                            <Button
                                                as="a"
                                                href="#contact"
                                                variant="primary"
                                                size="lg"
                                                className={styles.cta}
                                                onClick={handleCtaClick}
                                            >
                                                {t("cta")}
                                            </Button>
                                        </div>
                                    </GlassSurface>
                                </m.div>

                                <m.span
                                    className={cn(
                                        styles.availability,
                                        !hero.availableForWork && styles.availabilityOff
                                    )}
                                    style={{ y: availabilityY }}
                                >
                                    <span className={styles.availabilityDot} aria-hidden="true" />
                                    {hero.availableForWork ? t("availability") : t("unavailable")}
                                </m.span>
                            </m.div>
                        </m.div>
                    </Container>
                </m.div>

                <div className={styles.statsViewport}>
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
                </div>
            </div>
        </Section>
    );
}
