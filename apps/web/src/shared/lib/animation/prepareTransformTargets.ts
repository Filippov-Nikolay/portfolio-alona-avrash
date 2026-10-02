import { gsap } from "@/shared/lib/gsap";

/** Read CSS transforms as a batch before initial gsap.set/fromTo writes. */
export function prepareTransformTargets(targets: readonly (HTMLElement | null)[]) {
    targets.forEach((target) => {
        if (target) gsap.getProperty(target, "x");
    });
}
