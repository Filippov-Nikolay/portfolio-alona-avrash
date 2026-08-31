"use client";

import Image from "next/image";
import { m, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import { useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Container, Section, NoiseLayer, Button, GlassSurface } from "@/shared/ui";
import { siteConfig } from "@/shared/config/site.config";
import { cn } from "@/shared/lib/cn";
import { useMotionVariants } from "@/shared/hooks/useMotionVariants";
import { staggerContainer } from "@/shared/lib/motion/stagger";
import { fadeIn } from "@/shared/lib/motion/fade-in";
import { reveal } from "@/shared/lib/motion/reveal";
import { scrollToElementId } from "@/shared/lib/scroll";
import { usePreloader } from "@/shared/providers";
import type { HeroContent } from "@/entities/hero/model/hero";
import heroData from "@/entities/hero/model/hero.json";
import type { Social } from "@/entities/social/model/social";
import socialsData from "@/entities/social/model/social.json";
import styles from "./HeroSection.module.scss";

const [NAME_FIRST, ...nameRest] = siteConfig.name.split(" ");
const NAME_LAST = nameRest.join(" ");

const SOCIALS = socialsData as Social[];
const HERO = heroData as HeroContent;

const TITLE_TRAVEL_END = 0.93;
const IMAGE_TRAVEL_END = 0.95;
const PARALLAX_BLEND_RATIO = 0.16;
const PARALLAX_START_ASSIST_END = 0.05;
const PARALLAX_END_ASSIST_START = 0.86;
const TITLE_EXIT_SAFETY_MARGIN_MIN = 24;
const TITLE_EXIT_SAFETY_MARGIN_RATIO = 0.04;

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

export function HeroSection() {
    const t = useTranslations("hero");
    const safeStagger = useMotionVariants(staggerContainer);
    const safeFadeIn = useMotionVariants(fadeIn);
    const safeReveal = useMotionVariants(reveal);
    const { isReady } = usePreloader();
    const reduced = useReducedMotion();
    const scrollTrackRef = useRef<HTMLElement>(null);
    const titleTrackRef = useRef<HTMLDivElement>(null);
    const titleRef = useRef<HTMLHeadingElement>(null);
    const [titleExitX, setTitleExitX] = useState(-320);

    const { scrollYProgress } = useScroll({
        target: scrollTrackRef,
        offset: ["start start", "end end"],
    });

    useLayoutEffect(() => {
        if (reduced) {
            const rafId = requestAnimationFrame(() => setTitleExitX(0));
            return () => cancelAnimationFrame(rafId);
        }

        const titleTrack = titleTrackRef.current;
        const title = titleRef.current;

        if (!titleTrack || !title) {
            return;
        }

        const measure = () => {
            const currentX = readTranslateX(titleTrack);
            const trackRect = titleTrack.getBoundingClientRect();
            const titleRect = title.getBoundingClientRect();
            const baseLeft = trackRect.left - currentX;
            const safetyMargin = Math.max(
                window.innerWidth * TITLE_EXIT_SAFETY_MARGIN_RATIO,
                TITLE_EXIT_SAFETY_MARGIN_MIN
            );
            const nextExitX = -(baseLeft + titleRect.width + safetyMargin);

            setTitleExitX((prev) => (Math.abs(prev - nextExitX) < 0.5 ? prev : nextExitX));
        };

        const rafId = requestAnimationFrame(measure);
        const resizeObserver =
            typeof ResizeObserver === "undefined"
                ? null
                : new ResizeObserver(() => {
                      measure();
                  });

        resizeObserver?.observe(titleTrack);
        resizeObserver?.observe(title);
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

    const titleX = useTransform(
        scrollYProgress,
        [0, TITLE_TRAVEL_END, 1],
        [0, titleExitX, titleExitX]
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
        <Section ref={scrollTrackRef} className={styles.hero}>
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
                            {SOCIALS.map((social) => (
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
                                    <span className={styles.socialIcon} aria-hidden="true" />
                                </a>
                            ))}
                        </div>
                    </m.div>

                    <div className={styles.nameStage}>
                        <m.div
                            ref={titleTrackRef}
                            className={styles.nameTrack}
                            variants={safeFadeIn}
                            style={{ x: titleX }}
                        >
                            <h1 ref={titleRef} className={styles.name}>
                                <span className={styles.nameLine}>{NAME_FIRST}</span>
                                <span className={cn(styles.nameLine, styles.nameLineEnd)}>
                                    {NAME_LAST}
                                </span>
                            </h1>
                        </m.div>
                    </div>

                    {HERO.floatingImages.length > 0 && (
                        <m.div className={styles.floaters} aria-hidden="true">
                            {HERO.floatingImages.slice(0, 4).map((floater, index) => (
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
                                    <p className={styles.description}>{HERO.description}</p>

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
                                !HERO.availableForWork && styles.availabilityOff
                            )}
                            style={{ y: availabilityY }}
                        >
                            <span className={styles.availabilityDot} aria-hidden="true" />
                            {HERO.availableForWork ? t("availability") : t("unavailable")}
                        </m.span>
                    </m.div>
                </m.div>
            </Container>
        </Section>
    );
}
