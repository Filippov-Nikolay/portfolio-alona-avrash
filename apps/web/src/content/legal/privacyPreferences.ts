export const PRIVACY_PREFERENCES_LAST_UPDATED = "September 27, 2026";

export const PRIVACY_PREFERENCES_MARKDOWN = `
# Privacy Preferences & Consent Notice

Last updated: September 27, 2026

This notice explains the choices available in the privacy-preferences interface on avrash.com. It is a concise companion to the Privacy Policy and Cookie & Browser Storage Policy.

## 1. Your choice

The Website separates storage and processing into **Necessary**, **Preferences**, and **Analytics** categories.

Optional Analytics is off until you consent. You can use the Website without accepting Analytics.

## 2. Necessary

Necessary functionality is always available because it is required to remember privacy choices or provide essential functionality explicitly requested by you.

It includes:

- avrash-privacy-preferences in localStorage, which remembers your privacy selection; and
- NEXT_LOCALE, a session cookie containing only the selected language code (for example en or pl) when you explicitly change the Website language.

Necessary storage is not used by the Website's custom analytics system to create a persistent advertising or cross-site profile.

## 3. Preferences

If you allow Preferences, the Website may remember optional experience settings:

- site-theme in localStorage and a cookie, used to remember the selected theme and avoid incorrect-theme flashing; and
- site:preloader in localStorage plus site-preloader in a cookie, used to avoid replaying the intro/preloader unnecessarily.

The relevant preference cookies may last up to one year.

If you later disable Preferences, the Website removes these theme and preloader values from localStorage and cookies.

## 4. Analytics

If you accept Analytics, the Website may enable:

1. **Avrash custom analytics** — page views and selected portfolio/contact interactions sent to a Cloudflare Worker and stored in Cloudflare D1;
2. **Vercel Web Analytics** — traffic and audience analytics; and
3. **Vercel Speed Insights** — real-user performance measurements such as Web Vitals.

The custom analytics system may process page path, locale, event type, relevant project/category/social identifier, country, referrer origin, broad device/OS/browser categories, a tab/session UUID, a daily derived visitor identifier, and permitted UTM campaign fields on the first page view.

The custom daily visitor identifier is derived server-side from a secret salt, date, IP address, and User-Agent. The raw IP address and full User-Agent are not stored in the custom analytics database for that purpose, and the identifier changes each day.

Custom analytics events are automatically deleted after 730 days.

## 5. Analytics browser storage

After Analytics consent, the Website may use:

- avrash_analytics_session in sessionStorage — random session UUID; and
- avrash_analytics_seen in sessionStorage — recent-event information used for duplicate suppression.

These normally last only for the browser tab/session.

If you withdraw Analytics consent, the Website removes both analytics sessionStorage keys and stops future optional analytics collection unless you consent again.

## 6. Contact form is separate

The contact form is not conditional on Analytics consent. If you choose to send a message, the information you enter is processed to deliver and respond to that enquiry.

The form sends name, email, optional telephone number, message, language, and submission time through the Website's contact endpoint and Resend to the configured contact mailbox. The Website application does not intentionally store the form submission in its own database.

The contact endpoint may process IP address transiently for an in-memory anti-abuse rate limit. This is separate from optional Analytics.

## 7. Refusing optional categories

If you refuse Analytics:

- custom analytics events are not sent;
- the Website's analytics sessionStorage keys are not used for analytics; and
- Vercel Web Analytics and Speed Insights are not loaded by the Website.

If you refuse Preferences, optional theme/preloader choices are not retained through those preference storage mechanisms.

Core Website content remains available without Analytics consent, although disabling Preferences may mean that optional visual choices are not remembered.

## 8. Changing or withdrawing consent

You can reopen the Website's privacy-preferences controls and change your selection at any time.

A new choice applies prospectively. Withdrawing consent does not make earlier consent-based processing unlawful; it stops future optional processing by the Website from the point the new choice is applied.

## 9. More information

For full details about data categories, purposes, legal bases, service providers, retention, international transfers, and your rights, read the Privacy Policy.

For exact browser-storage names, categories, and lifetimes, read the Cookie & Browser Storage Policy.

Questions can be sent to:

Alona Avrash  
avrash.design@gmail.com
`;
