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
        linkedin: "https://www.linkedin.com/in/your-profile",
        telegram: "https://t.me/your-username",
        instagram: "https://instagram.com/",
        email: "mailto:hello@example.com",
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
