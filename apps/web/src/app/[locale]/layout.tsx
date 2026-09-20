import type { Metadata } from "next";
import { Almarai, Geist_Mono, Zalando_Sans_SemiExpanded } from "next/font/google";
import localFont from "next/font/local";
import { cookies } from "next/headers";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import { notFound } from "next/navigation";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { siteConfig } from "@/shared/config/site.config";
import { AppProviders } from "@/shared/providers";
import { Header } from "@/widgets/Header";
import { Footer } from "@/widgets/Footer";
import { LOCALES, isLocale, getLocaleMeta } from "@/i18n/locales";
import { buildPageAlternates } from "@/shared/lib/seo";
import { getSocials } from "@/entities/social/api/getSocials";
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
    const description = (await getTranslations({ locale, namespace: "seo" }))("description");
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
            images: [{ url: "/og/cover.png", width: 1200, height: 630 }],
        },
        twitter: {
            card: "summary_large_image",
            title,
            description,
        },
        icons: {
            icon: [{ url: "/icon/icon.png", type: "image/png" }],
            shortcut: "/icon/icon.png",
        },
        robots: { index: true, follow: true },
    };
}

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
    const { locale } = await params;

    if (!isLocale(locale)) {
        notFound();
    }

    const [messages, cookieStore, socials] = await Promise.all([
        getMessages(),
        cookies(),
        getSocials(),
    ]);

    // Приоритет: кука (явный выбор пользователя через ThemeToggle)
    //          → "light" (дефолт сайта, ВСЕГДА - системная тема пользователя
    //             намеренно не учитывается, см. useTheme.ts на клиенте)
    const savedTheme = cookieStore.get("site-theme")?.value;
    const hasSeenPreloader = cookieStore.get("site-preloader")?.value === "1";
    const theme: "dark" | "light" =
        savedTheme === "light" || savedTheme === "dark" ? savedTheme : "light";

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
            data-theme={theme}
            suppressHydrationWarning
            className={`${almarai.variable} ${zalandoSansSemiExpanded.variable} ${geistMono.variable} ${countryFlags.variable}`}
        >
            <body>
                <NextIntlClientProvider messages={messages}>
                    <AppProviders initialHasSeenPreloader={hasSeenPreloader}>
                        <Header />
                        <div className={styles.pageSlot}>{children}</div>
                        <Footer locale={locale} />
                    </AppProviders>
                    <SpeedInsights />
                    <Analytics />
                </NextIntlClientProvider>
                <script
                    type="application/ld+json"
                    dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
                />
            </body>
        </html>
    );
}
