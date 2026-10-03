# Legal documents

The site's four legal documents, written as Markdown strings in TypeScript and rendered as pages
under `/[locale]/legal/*`. The documents are in English for every locale. The page title and
description are localized from `messages/*.json`.

| File                    | Page                         | Document                             |
| ----------------------- | ---------------------------- | ------------------------------------ |
| `privacy.ts`            | `/legal/privacy`             | Privacy Policy                       |
| `cookies.ts`            | `/legal/cookies`             | Cookie & Browser Storage Policy      |
| `terms.ts`              | `/legal/terms`               | Terms of Use                         |
| `privacyPreferences.ts` | `/legal/privacy-preferences` | Privacy Preferences & Consent Notice |

Each file exports the Markdown and its `*_LAST_UPDATED` date (currently September 27, 2026).
[`legalLinks.ts`](legalLinks.ts) holds routes and titles for the footer, the `/legal` index and
the links between documents.

## Rendering

[`parseLegalMarkdown.ts`](parseLegalMarkdown.ts) parses the small Markdown subset these documents
use into a typed tree:

- headings, paragraphs and lists;
- tables;
- bold text, inline code and line breaks.

`shared/ui/LegalDocument` renders that tree with anchored sections and a table of contents. The
contents highlight the current section. In the sticky desktop layout they scroll only within
themselves and never move the page. Parser behavior is covered by `parseLegalMarkdown.test.ts`.

## What the documents describe

The text has to match the implementation. Update the documents when any of these change:

- Optional analytics (the custom worker, Vercel Web Analytics, Speed Insights) is off until the
  visitor gives Analytics consent.
- Custom analytics runs on a Cloudflare Worker with D1 and keeps data for 730 days, with daily
  cleanup.
- Referrers are reduced to their origin, in the browser and again in the worker.
- The daily visitor ID is a hash of a salt, the date, the IP and the User-Agent. The raw IP and
  User-Agent are not stored for it.
- `NEXT_LOCALE` is a necessary session cookie, set only after an explicit language change.
- Contact submissions are not stored by the site. They are sent through Resend to the contact
  mailbox. The sender's IP is used only for an in-memory rate limit of 5 attempts per 10 minutes.
- Theme and preloader state are stored only with Preferences consent.

The provider terms these documents rely on were reviewed on September 27, 2026:

- Cloudflare DPA v6.4 and Privacy Policy;
- Vercel Privacy Notice, DPA and Web Analytics documentation;
- Resend Privacy Policy and DPA.

The documents intentionally contain no company registration number, VAT number, postal address,
DPO, governing-law clause or jurisdiction, because none of these were provided.
