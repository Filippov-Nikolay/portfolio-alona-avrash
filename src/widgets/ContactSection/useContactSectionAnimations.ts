"use client";

import { useRef } from "react";
import { useReducedMotion } from "framer-motion";
import { gsap, useGSAP } from "@/shared/lib/gsap";

export function useContactSectionAnimations(enabled: boolean) {
    const sectionRef = useRef<HTMLElement>(null);
    const reducedMotion = useReducedMotion();

    useGSAP(
        () => {
            const section = sectionRef.current;
            if (!section || !enabled) return;

            const title = section.querySelector<HTMLElement>("[data-contact-title]");
            const intro = section.querySelector<HTMLElement>("[data-contact-intro]");
            const line = section.querySelector<HTMLElement>("[data-contact-line]");
            const dot = section.querySelector<HTMLElement>("[data-contact-dot]");
            const details = gsap.utils.toArray<HTMLElement>("[data-contact-detail]", section);
            const services = gsap.utils.toArray<HTMLElement>("[data-contact-service]", section);
            const form = section.querySelector<HTMLElement>("[data-contact-form]");
            const formItems = gsap.utils.toArray<HTMLElement>("[data-contact-form-item]", section);
            const targets = [
                title,
                intro,
                line,
                dot,
                form,
                ...details,
                ...services,
                ...formItems,
            ].filter(Boolean);

            if (reducedMotion) {
                gsap.set(targets, { clearProps: "all" });
                return;
            }

            const timeline = gsap.timeline({ defaults: { force3D: true } });

            if (title) {
                timeline.fromTo(
                    title,
                    { autoAlpha: 0, y: 42, filter: "blur(14px)" },
                    {
                        autoAlpha: 1,
                        y: 0,
                        filter: "blur(0px)",
                        duration: 0.9,
                        ease: "power3.out",
                    },
                    0
                );
            }

            if (intro) {
                timeline.fromTo(
                    intro,
                    { autoAlpha: 0, y: 26, filter: "blur(10px)" },
                    {
                        autoAlpha: 1,
                        y: 0,
                        filter: "blur(0px)",
                        duration: 0.75,
                        ease: "power3.out",
                    },
                    0.18
                );
            }

            if (line) {
                timeline.fromTo(
                    line,
                    { scaleY: 0, transformOrigin: "top center" },
                    { scaleY: 1, duration: 0.85, ease: "power3.inOut" },
                    0.38
                );
            }

            if (dot) {
                timeline.fromTo(
                    dot,
                    { scale: 0, autoAlpha: 0 },
                    { scale: 1, autoAlpha: 1, duration: 0.55, ease: "back.out(2.2)" },
                    0.88
                );
            }

            if (details.length > 0) {
                timeline.fromTo(
                    details,
                    { autoAlpha: 0, x: -20, y: 18 },
                    {
                        autoAlpha: 1,
                        x: 0,
                        y: 0,
                        duration: 0.65,
                        stagger: 0.14,
                        ease: "power3.out",
                    },
                    0.58
                );
            }

            if (services.length > 0) {
                timeline.fromTo(
                    services,
                    {
                        autoAlpha: 0,
                        x: -48,
                        y: 9,
                        scale: 0.97,
                        filter: "blur(5px)",
                        transformOrigin: "left center",
                    },
                    {
                        autoAlpha: 1,
                        x: 0,
                        y: 0,
                        scale: 1,
                        filter: "blur(0px)",
                        duration: 0.62,
                        stagger: 0.13,
                        ease: "back.out(1.45)",
                    },
                    0.84
                );
            }

            if (form) {
                timeline.fromTo(
                    form,
                    { autoAlpha: 0, y: 38, scale: 0.985, filter: "blur(10px)" },
                    {
                        autoAlpha: 1,
                        y: 0,
                        scale: 1,
                        filter: "blur(0px)",
                        duration: 0.85,
                        ease: "power3.out",
                    },
                    0.34
                );
            }

            if (formItems.length > 0) {
                timeline.fromTo(
                    formItems,
                    { autoAlpha: 0, y: 16 },
                    {
                        autoAlpha: 1,
                        y: 0,
                        duration: 0.5,
                        stagger: 0.07,
                        ease: "power2.out",
                    },
                    0.68
                );
            }
        },
        { scope: sectionRef, dependencies: [enabled, reducedMotion], revertOnUpdate: true }
    );

    return sectionRef;
}
