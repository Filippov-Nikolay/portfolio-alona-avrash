import type { Variants } from "framer-motion";
import { MOTION_DURATION, MOTION_EASE } from "@/shared/constants/motion";

export const slideDown: Variants = {
    hidden: {
        opacity: 0,
        y: -20,
    },
    visible: {
        opacity: 1,
        y: 0,
        transition: {
            duration: MOTION_DURATION.base,
            ease: MOTION_EASE,
        },
    },
};
