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
        // Instagram/Behance/LinkedIn/Pinterest live in packages/content-data/
        // src/social.json (getSocials()) - that's what actually renders the
        // icons, so it's the single source of truth for those.
        email: "mailto:avrash.design@gmail.com",
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
