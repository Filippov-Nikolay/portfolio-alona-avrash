import path from "node:path";
import type { NextConfig } from "next";

// SVGO's default preset strips `viewBox` whenever it exactly matches the
// SVG's `width`/`height` attributes (true for most icons in this project) —
// without a viewBox, CSS-resizing an icon crops its canvas instead of
// scaling the artwork. Keep it so icons can be freely resized via CSS.
// Mirrors apps/web/next.config.ts's svgrOptions - only the preview stage
// (packages/ui's WorksCard/ShowcaseModal icons) needs this here.
const svgrOptions = {
    svgoConfig: {
        plugins: [
            {
                name: "preset-default",
                params: {
                    overrides: {
                        removeViewBox: false,
                    },
                },
            },
        ],
    },
};

const nextConfig: NextConfig = {
    outputFileTracingRoot: path.join(__dirname, "../../"),
    transpilePackages: ["@avrash/content-schema", "@avrash/content-data", "@avrash/ui"],
    poweredByHeader: false,

    // Turbopack (next dev)
    turbopack: {
        rules: {
            "*.svg": {
                loaders: [{ loader: "@svgr/webpack", options: svgrOptions }],
                as: "*.tsx",
            },
        },
    },

    // Webpack (next build)
    webpack(config) {
        const fileLoaderRule = config.module.rules.find((rule: { test?: RegExp }) =>
            rule.test?.test?.(".svg")
        );
        if (fileLoaderRule) {
            fileLoaderRule.exclude = /\.svg$/i;
        }

        config.module.rules.push({
            test: /\.svg$/i,
            issuer: /\.[jt]sx?$/,
            use: [{ loader: "@svgr/webpack", options: svgrOptions }],
        });

        return config;
    },

    images: {
        // The preview stage renders project images straight off the running
        // web app (see assetUrl() in shared/config/assets.ts). Both apps run
        // on localhost in dev, which Next's image optimizer refuses to fetch
        // server-side (SSRF protection against private/loopback IPs) - and
        // the admin never needs optimization anyway, since it's only ever
        // previewing content the real site already serves/optimizes itself.
        // Plain unoptimized <img> tags sidestep that fetch entirely.
        unoptimized: true,
        // Still validated even when unoptimized - ShowcaseModal's banner
        // image asks for quality=95 (see its own comment on why).
        qualities: [75, 95],
    },
};

export default nextConfig;
