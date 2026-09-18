import type { NavItem } from "@/shared/types";
import { ContactIcon, ProjectIcon, UserIcon } from "@/shared/ui";

export const navigation: NavItem[] = [
    { key: "home", href: "/", icon: UserIcon },
    { key: "works", href: "/works", icon: ProjectIcon },
    { key: "contact", href: "/contact", icon: ContactIcon },
];
