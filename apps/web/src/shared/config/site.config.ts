import { env } from "./env";

// Central place for brand info shown across the site
// (header, preloader, footer, SEO metadata, JSON-LD).
// Works whether you're building a personal portfolio, a product page,
// or a company site — `name` can be a person, a product or a brand.
export const siteConfig = {
    name: "Alona Avrash",
    title: "Brand & Visual Designer",
    description: "Brand identity, packaging and logo design for growing brands.",
    url: env.siteUrl.replace(/\/$/, ""),
    links: {
        // TODO: replace with the real handle/URL once available.
        github: "https://github.com/your-username",
        telegram: "https://t.me/your-username",
        // Instagram/Behance/LinkedIn/Pinterest live in entities/social/model/
        // social.json (getSocials()) - that's what actually renders the
        // icons, so it's the single source of truth for those.
        email: "mailto:avrash.design@gmail.com",
        // Resolves the latest PDF managed in the admin's Global > CV section.
        cv: "/api/cv",
    },
};

// Derived monogram (e.g. "Your Brand" -> "YB") used by the logo/avatar/preloader.
export const siteInitials = siteConfig.name
    .split(" ")
    .filter(Boolean)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
