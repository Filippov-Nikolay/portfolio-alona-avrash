import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
    ...nextVitals,
    ...nextTs,
    {
        rules: {
            // Defaults to auto-detecting pages/app under the CWD - now that
            // this config lives at the monorepo root instead of next to the
            // Next.js app, it can't find apps/web/src/app on its own.
            "@next/next/no-html-link-for-pages": ["warn", "apps/web/src/app"],
        },
    },
    // Override default ignores of eslint-config-next. Patterns need the
    // "**/" prefix now that this config lives at the monorepo root but the
    // Next.js app (and its .next/out/next-env.d.ts) live under apps/web/ -
    // without it, a pattern only matches at the config's own directory,
    // not at any depth below it.
    globalIgnores([
        // Default ignores of eslint-config-next:
        "**/.next/**",
        "**/out/**",
        "**/build/**",
        "**/next-env.d.ts",
    ]),
]);

export default eslintConfig;
