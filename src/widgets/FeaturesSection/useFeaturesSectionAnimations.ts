"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { useArrayRefs, useScrollTriggerAutoRefresh } from "@/shared/hooks";
import { parallaxY, revealOnScroll } from "@/shared/lib/animation";
import { useGSAP, gsap } from "@/shared/lib/gsap";

const isCompactViewport = () => window.matchMedia("(max-width: 767px)").matches;
const getHeaderStart = () => (isCompactViewport() ? "top 82%" : "top 52%");
const getHeaderEnd = () => (isCompactViewport() ? "top 58%" : "top 30%");
const getArchStart = () => (isCompactViewport() ? "top 84%" : "top 64%");
const getArchEnd = () => (isCompactViewport() ? "top 56%" : "top 38%");
const getSkillCardStart = () => (isCompactViewport() ? "top 82%" : "top 68%");

export function useFeaturesSectionAnimations(
    groupCount: number,
    contentReady = true,
    enabled = true
) {
    const reduced = useReducedMotion();

    useScrollTriggerAutoRefresh([reduced, groupCount, contentReady, enabled]);

    const sectionRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLDivElement>(null);
    const headerLeadRef = useRef<HTMLDivElement>(null);
    const headerBioRef = useRef<HTMLDivElement>(null);
    const archRef = useRef<HTMLDivElement>(null);
    const archIllustrationRef = useRef<HTMLDivElement>(null);
    const skillGridRef = useRef<HTMLDivElement>(null);
    const { refs: skillCardRefs, setRef: setSkillCardRef } = useArrayRefs<HTMLDivElement>();

    useGSAP(
        () => {
            const header = headerRef.current;
            const headerLead = headerLeadRef.current;
            const headerBio = headerBioRef.current;

            if (!header || !headerLead || !headerBio) {
                return;
            }

            const revealTargets = [headerLead, headerBio];

            if (!enabled) {
                gsap.set(revealTargets, { autoAlpha: 0 });
                return;
            }

            if (reduced) {
                gsap.set(revealTargets, { clearProps: "all" });
                return;
            }

            gsap.timeline({
                defaults: {
                    ease: "none",
                    force3D: true,
                },
                scrollTrigger: {
                    trigger: header,
                    start: getHeaderStart,
                    end: getHeaderEnd,
                    scrub: 0.9,
                    invalidateOnRefresh: true,
                    fastScrollEnd: true,
                },
            })
                .fromTo(
                    headerLead,
                    { autoAlpha: 0, x: -32, y: 24, filter: "blur(12px)" },
                    {
                        autoAlpha: 1,
                        x: 0,
                        y: 0,
                        filter: "blur(0px)",
                        duration: 1,
                    },
                    0
                )
                .fromTo(
                    headerBio,
                    { autoAlpha: 0, x: 32, y: 24, filter: "blur(12px)" },
                    {
                        autoAlpha: 1,
                        x: 0,
                        y: 0,
                        filter: "blur(0px)",
                        duration: 1,
                    },
                    0.18
                );
        },
        { scope: sectionRef, dependencies: [reduced, enabled], revertOnUpdate: true }
    );

    // Arch reveal — always active, even during skeleton phase
    useGSAP(
        () => {
            const arch = archRef.current;
            if (!arch) return;

            if (!enabled) {
                gsap.set(arch, { autoAlpha: 0 });
                return;
            }

            if (reduced) {
                gsap.set(arch, { clearProps: "all" });
                return;
            }

            gsap.fromTo(
                arch,
                { autoAlpha: 0, y: 64, scale: 0.96, filter: "blur(16px)" },
                {
                    autoAlpha: 1,
                    y: 0,
                    scale: 1,
                    filter: "blur(0px)",
                    duration: 1,
                    ease: "none",
                    force3D: true,
                    scrollTrigger: {
                        trigger: arch,
                        start: getArchStart,
                        end: getArchEnd,
                        scrub: 1,
                        invalidateOnRefresh: true,
                        fastScrollEnd: true,
                    },
                }
            );
        },
        { scope: sectionRef, dependencies: [reduced, enabled], revertOnUpdate: true }
    );

    // Skill grid (skeleton phase) → illustration parallax + individual cards (content phase)
    useGSAP(
        () => {
            const arch = archRef.current;
            const archIllustration = archIllustrationRef.current;
            const skillGrid = skillGridRef.current;
            const skillCards = skillCardRefs.current.filter(Boolean) as HTMLDivElement[];

            if (!enabled) {
                const targets = [...(skillGrid ? [skillGrid] : []), ...skillCards];
                if (targets.length) {
                    gsap.set(targets, { autoAlpha: 0 });
                }
                return;
            }

            if (reduced) {
                const targets = [...(skillGrid ? [skillGrid] : []), ...skillCards];
                if (targets.length) gsap.set(targets, { clearProps: "all" });
                return;
            }

            if (!contentReady) {
                if (skillGrid) {
                    revealOnScroll({
                        target: skillGrid,
                        from: { autoAlpha: 0, y: 32 },
                        to: {
                            autoAlpha: 1,
                            y: 0,
                            duration: 0.7,
                            ease: "power3.out",
                            force3D: true,
                        },
                        start: getSkillCardStart,
                        once: false,
                        toggleActions: "play none none reverse",
                    });
                }
                return;
            }

            if (archIllustration && arch) {
                gsap.set(archIllustration, { transformOrigin: "50% 50%" });
                parallaxY({ target: archIllustration, trigger: arch });
            }

            skillCards.forEach((card, index) => {
                revealOnScroll({
                    target: card,
                    from: { autoAlpha: 0, y: 28 },
                    to: {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.62,
                        ease: "power3.out",
                        force3D: true,
                        delay: index * 0.04,
                    },
                    start: getSkillCardStart,
                    once: false,
                    toggleActions: "play none none reverse",
                });
            });
        },
        {
            scope: sectionRef,
            dependencies: [reduced, groupCount, contentReady, enabled],
            revertOnUpdate: true,
        }
    );

    return {
        sectionRef,
        headerRef,
        headerLeadRef,
        headerBioRef,
        archRef,
        archIllustrationRef,
        skillGridRef,
        setSkillCardRef,
    };
}
