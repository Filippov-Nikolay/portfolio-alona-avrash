/** =====================================
 * Переход между страницами App Router
====================================== */

import type { Variants } from "framer-motion";
import { MOTION_DURATION, MOTION_EASE } from "@/shared/constants/motion";

export const pageVariants: Variants = {
    initial: {
        opacity: 0,
        y: 16,
    },
    enter: {
        opacity: 1,
        y: 0,
        transition: {
            duration: MOTION_DURATION.base,
            ease: MOTION_EASE,
        },
    },
    exit: {
        opacity: 0,
        y: -16,
        transition: {
            duration: MOTION_DURATION.fast,
            ease: MOTION_EASE,
        },
    },
};
