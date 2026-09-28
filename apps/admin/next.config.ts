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

const r2PublicUrl = process.env.R2_PUBLIC_URL_BASE;

const remotePatterns = r2PublicUrl
    ? [
          {
              protocol: "https" as const,
              hostname: new URL(r2PublicUrl).hostname,
              pathname: "/**",
          },
      ]
    : [];

const nextConfig: NextConfig = {
    // Allow integration runs to keep their build output separate from local dev.
    distDir: process.env.NEXT_DIST_DIR ?? ".next",
    outputFileTracingRoot: path.join(__dirname, "../../"),
    outputFileTracingIncludes: {
        "/api/cv/preview-assets/*": [
            "./node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs",
            "./node_modules/pdfjs-dist/cmaps/**",
            "./node_modules/pdfjs-dist/standard_fonts/**",
            "./node_modules/pdfjs-dist/wasm/**",
        ],
    },
    transpilePackages: ["@avrash/content-schema", "@avrash/content-data", "@avrash/ui"],
    poweredByHeader: false,

    // Baked in once at build time (Next's `env` replaces these references at
    // compile time, unlike process.env.X read at runtime) - the System info
    // panel's "Last deploy" needs an actual build timestamp, not "now",
    // which is what reading a plain env var at request time would show on
    // every cold serverless start.
    env: {
        NEXT_PUBLIC_BUILD_TIME: new Date().toISOString(),
    },

    // Turbopack (next dev)
    turbopack: {
        rules: {
            "*.svg": {
                loaders: [{ loader: "@svgr/webpack", options: svgrOptions }],
                as: "*.js",
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
        remotePatterns,
    },
};

export default nextConfig;
