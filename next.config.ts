import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const isDev = process.env.NODE_ENV === "development";

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

    poweredByHeader: false,

    images: {
        remotePatterns: [],
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
                            `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""}`,
                            "style-src 'self' 'unsafe-inline'",
                            "font-src 'self' https://fonts.gstatic.com",
                            "img-src 'self' data: blob:",
                            "connect-src 'self'",
                            "frame-ancestors 'none'",
                        ].join("; "),
                    },
                ],
            },
        ];
    },
};

export default withNextIntl(nextConfig);
