import path from "node:path";
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";
const isVercel = process.env.VERCEL === "1";
const isNonProductionDeployment =
    process.env.VERCEL_ENV !== undefined && process.env.VERCEL_ENV !== "production";

// Preview deployments inject the Vercel Toolbar from vercel.live. Keep the
// production CSP strict everywhere else while allowing the toolbar's own
// scripts, iframe, assets and feedback connection when Vercel adds it.
const vercelScriptSource = isVercel ? " https://vercel.live" : "";
const vercelStyleSource = isVercel ? " https://vercel.live" : "";
const vercelFontSources = isVercel ? " https://vercel.live https://assets.vercel.com" : "";
const vercelImageSources = isVercel ? " https://vercel.live https://vercel.com" : "";
const vercelConnectSources = isVercel ? " https://vercel.live wss://ws-us3.pusher.com" : "";

const analyticsEndpoint = process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT;

const analyticsConnectSource = analyticsEndpoint ? ` ${new URL(analyticsEndpoint).origin}` : "";

// Single source of truth for the R2/CDN origin admin's uploaded images (and,
// via CONTENT_SOURCE=remote, JSON content) are served from - see
// shared/api/contentClient.ts and apps/admin's R2_PUBLIC_URL_BASE. Deriving
// both the Image allowlist and the CSP img-src from this one env var means
// turning on remote R2 in production is a single env change, not three
// separately-remembered ones.
const cdnOrigin = process.env.CONTENT_CDN_URL ? new URL(process.env.CONTENT_CDN_URL) : undefined;

// SVGO's default preset strips `viewBox` whenever it exactly matches the
// SVG's `width`/`height` attributes (true for most icons in this project) —
// without a viewBox, CSS-resizing an icon crops its canvas instead of
// scaling the artwork. Keep it so icons can be freely resized via CSS.
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
    // Allow integration runs to keep their build output separate from local dev.
    distDir: process.env.NEXT_DIST_DIR ?? ".next",
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
        // Отключаем дефолтный Next.js обработчик .svg
        const fileLoaderRule = config.module.rules.find((rule: { test?: RegExp }) =>
            rule.test?.test?.(".svg")
        );
        if (fileLoaderRule) {
            fileLoaderRule.exclude = /\.svg$/i;
        }

        // SVGR — импорт .svg как React-компонента
        config.module.rules.push({
            test: /\.svg$/i,
            issuer: /\.[jt]sx?$/,
            use: [{ loader: "@svgr/webpack", options: svgrOptions }],
        });

        return config;
    },

    output: process.env.NEXT_OUTPUT === "standalone" ? "standalone" : undefined,

    // This app now lives in a pnpm workspace (apps/web) and depends on
    // packages/content-schema, which sits outside this directory. Without
    // this, the standalone build's file tracing wouldn't follow that
    // dependency back to the monorepo root and would silently omit it.
    outputFileTracingRoot: path.join(__dirname, "../../"),
    transpilePackages: [
        "@avrash/content-schema",
        "@avrash/content-data",
        "@avrash/rate-limit",
        "@avrash/ui",
    ],

    // Default is 60s. CI runners are 2-core, so page generation runs on a
    // single worker there (vs several locally) - give it real headroom
    // instead of racing a cold, single-threaded build against the default.
    staticPageGenerationTimeout: 180,

    poweredByHeader: false,
    agentRules: false,

    images: {
        // Uploaded image URLs are immutable (their keys include a timestamp),
        // so keep generated Next Image variants across ordinary revisits and
        // reduce repeat reads from the R2 origin.
        minimumCacheTTL: 31 * 24 * 60 * 60,
        remotePatterns: cdnOrigin
            ? [
                  {
                      protocol: cdnOrigin.protocol.replace(":", "") as "http" | "https",
                      hostname: cdnOrigin.hostname,
                  },
              ]
            : [],
        // Next only serves qualities explicitly allow-listed here (else 400s).
        // 75 stays the project-wide default; 95 is opted into per-Image where
        // the default's visible softening actually matters (e.g. the
        // full-bleed ShowcaseModal banner); 72 is the small peek-preview
        // thumbnails in ToolsSection, where a touch of extra compression is
        // invisible at their rendered size.
        qualities: [72, 75, 95],
    },

    async headers() {
        return [
            {
                source: "/(.*)",
                headers: [
                    {
                        key: "X-Frame-Options",
                        value: "DENY",
                    },
                    ...(isNonProductionDeployment
                        ? [{ key: "X-Robots-Tag", value: "noindex, nofollow" }]
                        : []),
                    {
                        key: "X-Content-Type-Options",
                        value: "nosniff",
                    },
                    {
                        key: "Referrer-Policy",
                        value: "strict-origin-when-cross-origin",
                    },
                    {
                        // Запрашиваем у браузера системную тему — он вернёт её
                        // в Sec-CH-Prefers-Color-Scheme при следующих запросах.
                        // Vary нужен, чтобы CDN не отдавал кешированную страницу
                        // другой темы другому пользователю.
                        key: "Accept-CH",
                        value: "Sec-CH-Prefers-Color-Scheme",
                    },
                    {
                        key: "Vary",
                        value: "Sec-CH-Prefers-Color-Scheme",
                    },
                    {
                        key: "Content-Security-Policy",
                        value: [
                            "default-src 'self'",
                            `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}${vercelScriptSource}`,
                            `style-src 'self' 'unsafe-inline'${vercelStyleSource}`,
                            `font-src 'self' https://fonts.gstatic.com${vercelFontSources}`,
                            `img-src 'self' data: blob:${cdnOrigin ? ` ${cdnOrigin.origin}` : ""}${vercelImageSources}`,
                            `connect-src 'self'${vercelConnectSources}${analyticsConnectSource}`,
                            ...(isVercel ? ["frame-src https://vercel.live"] : []),
                            "frame-ancestors 'none'",
                        ].join("; "),
                    },
                ],
            },
        ];
    },
};

export default withNextIntl(nextConfig);
