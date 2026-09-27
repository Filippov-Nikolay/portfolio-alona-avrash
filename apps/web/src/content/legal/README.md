# Avrash legal bundle — final

Prepared: September 27, 2026
Basis: final telemetry/privacy implementation supplied for dev version 0.23.0, including the subsequent referrer-origin and NEXT_LOCALE verification.

## Four legal documents

1. `privacy.ts` — Privacy Policy
2. `cookies.ts` — Cookie & Browser Storage Policy
3. `terms.ts` — Terms of Use
4. `privacyPreferences.ts` — Privacy Preferences & Consent Notice

## Integration helpers

- `legalLinks.ts` — routes/titles updated for all four documents.
- `parseLegalMarkdown.ts` — existing reusable markdown parser included for convenience.

## Implementation facts reflected

- Optional custom analytics, Vercel Web Analytics, and Vercel Speed Insights are disabled before Analytics consent.
- Custom analytics uses Cloudflare Worker + D1.
- D1 analytics retention: 730 days, with daily cleanup.
- Referrer is reduced to HTTP(S) origin in the browser and normalized again by the Worker; full referrer URLs are not intentionally sent to the custom analytics endpoint.
- Daily visitor ID is derived from salt + date + IP + User-Agent; raw IP and full UA are not stored in the custom analytics DB for that purpose.
- `NEXT_LOCALE` is a Necessary session cookie created after explicit locale change; value is `en`/`pl`, Path=/, SameSite=Lax, no explicit expiry.
- Contact submissions are not stored in the Website application's own database; they are transmitted through Resend to the contact mailbox.
- Contact IP is processed transiently for an in-memory 5-attempts/10-minute rate limit.
- Operator/contact used in the documents: Alona Avrash / avrash.design@gmail.com / avrash.com.

## External legal/documentation checked (September 27, 2026)

- Cloudflare Data Processing Addendum, v6.4 effective April 3, 2026.
- Cloudflare Privacy Policy.
- Vercel Privacy Notice, last updated June 1, 2026.
- Vercel Data Processing Addendum.
- Vercel Web Analytics documentation / published privacy characteristics.
- Resend Privacy Policy, last updated August 27, 2026.
- Resend Data Processing Addendum.

## Integration note

The existing project previously exposed only privacy/cookies/terms legal routes. `privacyPreferences.ts` is a fourth standalone legal document, so the application must have a matching `/legal/privacy-preferences` page (or adjust `legalLinks.ts` to the route you choose). If the preference UI already links only to Privacy/Cookies, the fourth document can still be surfaced from the legal footer/preferences modal.

## Scope note

These files are source-aligned legal drafts prepared from the supplied implementation and current provider documentation. They intentionally do not invent a company registration number, VAT number, postal business address, DPO, governing-law clause, or exclusive jurisdiction that was not supplied.
