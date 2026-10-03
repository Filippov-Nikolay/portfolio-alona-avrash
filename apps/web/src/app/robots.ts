import type { MetadataRoute } from "next";
import { siteConfig } from "@/shared/config/site.config";
import { isIndexable } from "@/shared/lib/seo";

export default function robots(): MetadataRoute.Robots {
    if (!isIndexable()) {
        return { rules: { userAgent: "*", disallow: "/" } };
    }

    return {
        rules: {
            userAgent: "*",
            allow: "/",
        },
        sitemap: `${siteConfig.url}/sitemap.xml`,
    };
}
