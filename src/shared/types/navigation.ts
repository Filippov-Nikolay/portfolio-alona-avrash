import type { ComponentType, SVGProps } from "react";

export interface NavItem {
    key: string;
    href: string;
    external?: boolean;
    /** Icon shown in contexts that render one (e.g. the mobile bottom nav). */
    icon?: ComponentType<SVGProps<SVGSVGElement>>;
}
