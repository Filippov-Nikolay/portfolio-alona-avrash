/** =====================================
 * Базовый пресет, появление элемента
====================================== */

import type { Variants } from "framer-motion";
import { MOTION_DURATION, MOTION_EASE } from "@/shared/constants/motion";

export const fadeIn: Variants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: {
            duration: MOTION_DURATION.base,
            ease: MOTION_EASE,
        },
    },
};
