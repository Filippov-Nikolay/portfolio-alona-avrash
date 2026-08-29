/** =====================================
 * Появление снизу вверх
====================================== */

import type { Variants } from "framer-motion";
import { MOTION_DURATION, MOTION_EASE } from "@/shared/constants/motion";

export const reveal: Variants = {
    hidden: {
        opacity: 0,
        y: 32,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: MOTION_DURATION.slow,
            ease: MOTION_EASE,
        },
    },
};
