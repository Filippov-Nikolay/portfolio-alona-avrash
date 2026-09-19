export interface AdminSection {
    slug: string;
    label: string;
}

export interface AdminPage {
    slug: string;
    label: string;
    sections: AdminSection[];
}

export const ADMIN_NAV: AdminPage[] = [
    {
        slug: "dashboard",
        label: "Dashboard",
        sections: [{ slug: "analytics", label: "Analytics" }],
    },
    {
        slug: "home",
        label: "Home",
        sections: [
            { slug: "hero", label: "Hero" },
            { slug: "stats", label: "Stats" },
            { slug: "services", label: "Services" },
            { slug: "projects", label: "Projects" },
            { slug: "clients", label: "Clients" },
            { slug: "tools", label: "Tools" },
            { slug: "reviews", label: "Reviews" },
            { slug: "cta", label: "Cta" },
        ],
    },
    {
        slug: "works",
        label: "Works",
        sections: [{ slug: "projects", label: "Projects" }],
    },
    {
        slug: "contact",
        label: "Contact",
        sections: [{ slug: "socials", label: "Socials" }],
    },
    {
        slug: "global",
        label: "Global",
        sections: [
            { slug: "socials", label: "Socials" },
            { slug: "footer", label: "Footer" },
            { slug: "categories", label: "Categories" },
            { slug: "tool-badges", label: "Tool Badges" },
        ],
    },
];

export function findPage(pageSlug: string): AdminPage | undefined {
    return ADMIN_NAV.find((page) => page.slug === pageSlug);
}

export function findSection(pageSlug: string, sectionSlug: string): AdminSection | undefined {
    return findPage(pageSlug)?.sections.find((section) => section.slug === sectionSlug);
}
