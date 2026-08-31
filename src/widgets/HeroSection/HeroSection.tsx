"use client";

import Image from "next/image";
import { m, useMotionTemplate, useScroll, useSpring, useTransform } from "framer-motion";
import { useTranslations } from "next-intl";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Container, Section, NoiseLayer, Button, GlassSurface } from "@/shared/ui";
import { siteConfig } from "@/shared/config/site.config";
import { cn } from "@/shared/lib/cn";
import { useMotionVariants } from "@/shared/hooks/useMotionVariants";
import { staggerContainer } from "@/shared/lib/motion/stagger";
import { fadeIn } from "@/shared/lib/motion/fade-in";
import { scrollToElementId } from "@/shared/lib/scroll";
import { usePreloader } from "@/shared/providers";
import type { Social } from "@/entities/social/model/social";
import socialsData from "@/entities/social/model/social.json";
import type { HeroContent } from "@/entities/hero/model/hero";
import heroData from "@/entities/hero/model/hero.json";
import styles from "./HeroSection.module.scss";

const [NAME_FIRST, ...nameRest] = siteConfig.name.split(" ");
const NAME_LAST = nameRest.join(" ");
const SOCIALS = socialsData as Social[];
const HERO = heroData as HeroContent;
const ENABLE_HERO_LOGO_MORPH = false;

function handleCtaClick(e: React.MouseEvent) {
    e.preventDefault();
    scrollToElementId("contact", { offset: 100 });
}

interface FlipState {
    dx: number;
    dy: number;
    scale: number;
}

interface RgbColor {
    r: number;
    g: number;
    b: number;
}

const FLIP_REST: FlipState = { dx: 0, dy: 0, scale: 1 };
const ACCENT_RGB: RgbColor = { r: 234, g: 253, b: 39 };
const TITLE_MORPH_START = 0.04;
const TITLE_MORPH_END = 0.78;
const TITLE_HANDOFF_START = 0.56;
const TITLE_HANDOFF_END = 0.72;

function clamp01(value: number) {
    return Math.max(0, Math.min(1, value));
}

function mix(from: number, to: number, progress: number) {
    return from + (to - from) * progress;
}

function easeInOutCubic(value: number) {
    const t = clamp01(value);
    if (t < 0.5) {
        return 4 * t * t * t;
    }

    return 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function normalizeMorphProgress(value: number) {
    return easeInOutCubic(
        clamp01((value - TITLE_MORPH_START) / (TITLE_MORPH_END - TITLE_MORPH_START))
    );
}

function easedTransform(value: number, target: number, power = 1) {
    return mix(0, target, easeInOutCubic(Math.pow(clamp01(value), power)));
}

function parseRgbColor(value: string) {
    const channels = value.match(/\d+(?:\.\d+)?/g);

    if (!channels || channels.length < 3) {
        return null;
    }

    return {
        r: Number(channels[0]),
        g: Number(channels[1]),
        b: Number(channels[2]),
    } satisfies RgbColor;
}

export function HeroSection() {
    const t = useTranslations("hero");
    const safeStagger = useMotionVariants(staggerContainer);
    const safeFadeIn = useMotionVariants(fadeIn);
    const { isReady } = usePreloader();

    const scrollTrackRef = useRef<HTMLElement>(null);
    const line1Ref = useRef<HTMLSpanElement>(null);
    const line2Ref = useRef<HTMLSpanElement>(null);
    const [flip1, setFlip1] = useState<FlipState>(FLIP_REST);
    const [flip2, setFlip2] = useState<FlipState>(FLIP_REST);
    const [fromColor, setFromColor] = useState<RgbColor | null>(null);
    const [mounted, setMounted] = useState(false);
    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    const { scrollYProgress } = useScroll({
        target: scrollTrackRef,
        offset: ["start start", "end end"],
    });
    const morphProgress = useTransform(scrollYProgress, normalizeMorphProgress);
    const smoothMorphProgress = useSpring(morphProgress, {
        stiffness: 132,
        damping: 28,
        mass: 0.52,
        restDelta: 0.0001,
    });

    useEffect(() => {
        if (!ENABLE_HERO_LOGO_MORPH) {
            return;
        }

        function flipFor(lineEl: HTMLElement | null, targetEl: HTMLElement | null): FlipState {
            if (!lineEl || !targetEl) return FLIP_REST;
            const lineRect = lineEl.getBoundingClientRect();
            const targetRect = targetEl.getBoundingClientRect();
            if (!lineRect.height || !targetRect.height) return FLIP_REST;
            return {
                dx: targetRect.left - lineRect.left,
                dy: targetRect.top - lineRect.top,
                scale: targetRect.height / lineRect.height,
            };
        }

        function measure() {
            const target1 = document.querySelector<HTMLElement>('[data-hero-logo-line="0"]');
            const target2 = document.querySelector<HTMLElement>('[data-hero-logo-line="1"]');
            setFlip1(flipFor(line1Ref.current, target1));
            setFlip2(flipFor(line2Ref.current, target2));
            if (line1Ref.current) {
                setFromColor(parseRgbColor(getComputedStyle(line1Ref.current).color));
            }
        }

        measure();
        const timeoutIds = [120, 320, 620, 920].map((delay) => window.setTimeout(measure, delay));
        const resizeObserver =
            typeof ResizeObserver === "undefined"
                ? null
                : new ResizeObserver(() => {
                      measure();
                  });

        [scrollTrackRef.current, line1Ref.current, line2Ref.current].forEach((node) => {
            if (node) {
                resizeObserver?.observe(node);
            }
        });

        document
            .querySelectorAll<HTMLElement>("[data-hero-logo-line]")
            .forEach((node) => resizeObserver?.observe(node));

        const handleResize = () => measure();

        void document.fonts?.ready.then(measure);
        window.addEventListener("resize", handleResize);

        return () => {
            timeoutIds.forEach((id) => window.clearTimeout(id));
            resizeObserver?.disconnect();
            window.removeEventListener("resize", handleResize);
        };
    }, [isReady]);

    const line1X = useTransform(smoothMorphProgress, (value) =>
        easedTransform(value, flip1.dx, 1.2)
    );
    const line1Y = useTransform(smoothMorphProgress, (value) => easedTransform(value, flip1.dy, 1));
    const line1Scale = useTransform(smoothMorphProgress, (value) =>
        mix(1, flip1.scale, easeInOutCubic(value))
    );
    const line2X = useTransform(smoothMorphProgress, (value) =>
        easedTransform(value, flip2.dx, 1.85)
    );
    const line2Y = useTransform(smoothMorphProgress, (value) =>
        easedTransform(value, flip2.dy, 1.08)
    );
    const line2Scale = useTransform(smoothMorphProgress, (value) =>
        mix(1, flip2.scale, easeInOutCubic(value))
    );
    const colorProgress = useTransform(scrollYProgress, [0.18, TITLE_HANDOFF_START], [0, 1]);
    const easedColorProgress = useTransform(colorProgress, (value) =>
        easeInOutCubic(clamp01(value))
    );
    const nameOpacity = useTransform(
        scrollYProgress,
        [0, TITLE_HANDOFF_START, TITLE_HANDOFF_END, 1],
        [1, 1, 0, 0]
    );
    const colorR = useTransform(easedColorProgress, (value) =>
        Math.round(mix(fromColor?.r ?? ACCENT_RGB.r, ACCENT_RGB.r, value))
    );
    const colorG = useTransform(easedColorProgress, (value) =>
        Math.round(mix(fromColor?.g ?? ACCENT_RGB.g, ACCENT_RGB.g, value))
    );
    const colorB = useTransform(easedColorProgress, (value) =>
        Math.round(mix(fromColor?.b ?? ACCENT_RGB.b, ACCENT_RGB.b, value))
    );
    const nameColor = useMotionTemplate`rgb(${colorR} ${colorG} ${colorB})`;
    const shouldApplyMorph = ENABLE_HERO_LOGO_MORPH && mounted;

    return (
        <Section
            ref={scrollTrackRef}
            className={cn(styles.hero, ENABLE_HERO_LOGO_MORPH && styles.heroMorphEnabled)}
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

                    <m.h1 className={styles.name} variants={safeFadeIn}>
                        <m.span
                            ref={line1Ref}
                            className={styles.nameLine}
                            style={{
                                x: shouldApplyMorph ? line1X : undefined,
                                y: shouldApplyMorph ? line1Y : undefined,
                                scale: shouldApplyMorph ? line1Scale : undefined,
                                opacity: shouldApplyMorph ? nameOpacity : undefined,
                                color: shouldApplyMorph && fromColor ? nameColor : undefined,
                                transformOrigin: "left top",
                            }}
                        >
                            {NAME_FIRST}
                        </m.span>
                        <m.span
                            ref={line2Ref}
                            className={cn(styles.nameLine, styles.nameLineEnd)}
                            style={{
                                x: shouldApplyMorph ? line2X : undefined,
                                y: shouldApplyMorph ? line2Y : undefined,
                                scale: shouldApplyMorph ? line2Scale : undefined,
                                opacity: shouldApplyMorph ? nameOpacity : undefined,
                                color: shouldApplyMorph && fromColor ? nameColor : undefined,
                                transformOrigin: "left top",
                            }}
                        >
                            {NAME_LAST}
                        </m.span>
                    </m.h1>

                    <div>
                        {HERO.floatingImages.length > 0 && (
                            <div className={styles.floaters} aria-hidden="true">
                                {HERO.floatingImages.slice(0, 4).map((floater) => (
                                    <m.div
                                        key={floater.id}
                                        className={styles.floater}
                                        variants={safeFadeIn}
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
                                            sizes="240px"
                                            draggable={false}
                                        />
                                    </m.div>
                                ))}
                            </div>
                        )}

                        <div className={styles.introRow}>
                            <div className={styles.introCardWrap}>
                                <GlassSurface
                                    as="article"
                                    className={styles.introCard}
                                    contentClassName={styles.introCardContent}
                                    preset="hero"
                                    interactive={false}
                                    reveal="clip-up"
                                    revealed={isReady}
                                    revealDelayMs={700}
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
                            </div>

                            <m.span
                                className={cn(
                                    styles.availability,
                                    !HERO.availableForWork && styles.availabilityOff
                                )}
                                variants={safeFadeIn}
                            >
                                <span className={styles.availabilityDot} aria-hidden="true" />
                                {HERO.availableForWork ? t("availability") : t("unavailable")}
                            </m.span>
                        </div>
                    </div>
                </m.div>
            </Container>
        </Section>
    );
}
