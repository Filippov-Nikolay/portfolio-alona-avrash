import type { Metadata } from "next";
import { Almarai, Geist_Mono, Zalando_Sans_SemiExpanded } from "next/font/google";
import localFont from "next/font/local";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { siteConfig } from "@/shared/config/site.config";
import { AppProviders } from "@/shared/providers";
import { Header } from "@/widgets/Header";
import { Footer } from "@/widgets/Footer";
import { LOCALES, isLocale, getLocaleMeta } from "@/i18n/locales";
import { DEFAULT_OG_IMAGES, buildPageAlternates, robotsDirectives } from "@/shared/lib/seo";
import { getSocials } from "@/entities/social/api/getSocials";
import { getIcon } from "@/entities/icon/api/getIcon";
import { getCv } from "@/entities/cv/api/getCv";
import { DOCUMENT_STATE_SCRIPT } from "@/shared/lib/documentState";
import packageJson from "../../../package.json";
import styles from "./layout.module.scss";

import "@/shared/styles/globals.scss";

// Site-wide title/description font. Light (300) is used for body copy,
// bold (700) for headings — see typography.scss.
const almarai = Almarai({
    subsets: ["latin"],
    weight: ["300", "400", "700", "800"],
    variable: "--font-almarai",
});

// Used only for the Hero headline and the Footer brand name — see
// --font-title-accent in typography.scss.
const zalandoSansSemiExpanded = Zalando_Sans_SemiExpanded({
    subsets: ["latin"],
    weight: ["700"],
    variable: "--font-zalando",
});

const geistMono = Geist_Mono({
    subsets: ["latin"],
    variable: "--font-geist-mono",
});

// Chromium on Windows renders country flags as ISO letters. This compact
// flag-only font provides those glyphs without shipping hundreds of SVG files.
const countryFlags = localFont({
    src: "../../../node_modules/country-flag-emoji-polyfill/dist/TwemojiCountryFlags.woff2",
    variable: "--font-country-flags",
    display: "swap",
    preload: false,
});

export function generateStaticParams() {
    return LOCALES.map(({ code }) => ({ locale: code }));
}

const KEYWORDS_COMMON = [
    siteConfig.name,
    siteConfig.title,
    "brand identity design",
    "packaging design",
    "logo design",
    "visual identity",
    "graphic designer portfolio",
];

interface LocaleLayoutProps {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}

export async function generateMetadata({ params }: LocaleLayoutProps): Promise<Metadata> {
    const { locale } = await params;
    const title = `${siteConfig.name} — ${siteConfig.title}`;
    const [description, icon] = await Promise.all([
        getTranslations({ locale, namespace: "seo" }).then((t) => t("description")),
        getIcon(),
    ]);
    const { ogLocale } = getLocaleMeta(locale);
    const { canonical, languages } = buildPageAlternates(locale);

    return {
        metadataBase: new URL(siteConfig.url),
        title: {
            default: title,
            template: `%s | ${siteConfig.name}`,
        },
        description,
        keywords: KEYWORDS_COMMON,
        authors: [{ name: siteConfig.name }],
        creator: siteConfig.name,
        alternates: {
            canonical,
            languages,
        },
        openGraph: {
            title,
            description,
            url: canonical,
            siteName: siteConfig.name,
            type: "website",
            locale: ogLocale,
            images: DEFAULT_OG_IMAGES,
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
            images: [DEFAULT_OG_IMAGES[0]],
        },
        icons: {
            // Browsers cache favicons far more aggressively than normal HTTP
            // cache headers allow for, so a plain file swap alone often will
            // not show up for returning visitors. Bust it with the app
            // version, which is already incremented on every release.
            // Browsers take the last icon they can render, so the PNG goes
            // first as the fallback (Safari and older browsers) and the SVG
            // last so it wins wherever SVG favicons are supported.
            icon: [
                { url: `${icon.src}?v=${packageJson.version}`, type: "image/png", sizes: "32x32" },
                {
                    url: `/icon/icon.svg?v=${packageJson.version}`,
                    type: "image/svg+xml",
                    sizes: "any",
                },
            ],
            shortcut: `${icon.src}?v=${packageJson.version}`,
        },
        robots: robotsDirectives(),
    };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
    const { locale } = await params;

    if (!isLocale(locale)) {
        notFound();
    }
    setRequestLocale(locale);

    const [messages, socials, cv] = await Promise.all([getMessages(), getSocials(), getCv(locale)]);

    // Personal-portfolio structured data — see README > Customization > SEO.
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "Person",
        name: siteConfig.name,
        description: siteConfig.title,
        url: siteConfig.url,
        sameAs: socials.map((social) => social.link),
    };

    return (
        <html
            lang={locale}
            data-theme="light"
            suppressHydrationWarning
            className={`${almarai.variable} ${zalandoSansSemiExpanded.variable} ${geistMono.variable} ${countryFlags.variable}`}
        >
            <head>
                <script dangerouslySetInnerHTML={{ __html: DOCUMENT_STATE_SCRIPT }} />
            </head>
            <body>
                <NextIntlClientProvider messages={messages}>
                    <AppProviders>
                        <Header cv={cv ? { href: `/api/cv/${locale}`, locale: cv.locale } : null} />
                        <div className={styles.pageSlot}>{children}</div>
                        <Footer locale={locale} />
                    </AppProviders>
                </NextIntlClientProvider>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </body>
        </html>
    );
}
