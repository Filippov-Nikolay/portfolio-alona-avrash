/** =====================================
 * Контейнер, который анимирует дочерние элементы по очереди
====================================== */

import type { Variants } from "framer-motion";
import { MOTION_DURATION } from "@/shared/constants/motion";

export const staggerContainer: Variants = {
    hidden: {},
    visible: {
        transition: {
            staggerChildren: MOTION_DURATION.fast,
            delayChildren: 0.1,
        },
    },
};
