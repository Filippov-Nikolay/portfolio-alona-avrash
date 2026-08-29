import type { NavItem } from "@/shared/types";
import { ContactIcon, ProjectIcon, StackIcon } from "@/shared/ui";

// Single source of truth for the header/footer nav and the scroll-spy
// (active-section highlighting). Add/remove/reorder an entry here and
// every consumer (Header, Footer, useActiveSection) picks it up —
// nothing else needs to change in sync.
export const navigation: NavItem[] = [
    { key: "services", href: "#services", icon: StackIcon, scrollOffset: -40 },
    { key: "showcase", href: "#showcase", icon: ProjectIcon },
    { key: "contact", href: "#contact", icon: ContactIcon },
];
