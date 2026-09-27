export const COOKIE_POLICY_LAST_UPDATED = "September 27, 2026";

export const COOKIE_POLICY_MARKDOWN = `
# Cookie & Browser Storage Policy

Last updated: September 27, 2026

This Policy explains how avrash.com uses cookies and similar browser technologies, including localStorage, sessionStorage, and short-lived in-memory state.

## 1. Who operates the Website

Website operator: Alona Avrash  
Website: avrash.com  
Contact: avrash.design@gmail.com

## 2. Categories

The Website separates browser storage into the following categories:

- **Necessary** — required to remember privacy choices or provide essential requested functionality such as an explicit language choice;
- **Preferences** — optional storage used to remember visual/experience preferences such as theme and whether the intro preloader has already been shown; and
- **Analytics** — optional storage used by the Website's analytics system after Analytics consent.

Optional Analytics is disabled until you consent. Preference storage is controlled separately through the Website's privacy preferences.

## 3. Necessary storage

### avrash-privacy-preferences

Technology: localStorage  
Category: Necessary  
Purpose: stores the current privacy-preference version, category choices, and choice date so the Website can respect your selection.  
Lifetime: remains until cleared by the browser/user or replaced by a later preference record.

This storage is necessary to remember whether optional categories are allowed. Removing it may cause the Website to ask for your privacy choices again.

### NEXT_LOCALE

Technology: cookie  
Category: Necessary  
Value: language code such as en or pl  
Purpose: remembers an explicit language change so a later visit to the root route can use the selected language.  
When created: it is not normally created merely by visiting the Website; it is created when the user explicitly changes locale, including through the language switcher or an equivalent locale transition.  
Lifetime: session cookie; no Expires or Max-Age is set, so it normally lasts until the browser session ends.  
Path: /  
SameSite: Lax

## 4. Preference storage

Preference storage is used only in accordance with the Website's Preferences setting.

### site-theme

Technology: localStorage and cookie  
Category: Preferences  
Purpose: remembers the selected visual theme and allows the server to render the selected theme without an avoidable visual flash.  
Cookie lifetime: up to one year.  
Removal: disabling Preferences causes the Website to remove the stored theme value from localStorage and the corresponding cookie.

### site:preloader / site-preloader

Technology: localStorage (site:preloader) and cookie (site-preloader)  
Category: Preferences  
Purpose: remembers that the intro/preloader has already been shown so it does not need to be repeated.  
Cookie lifetime: up to one year.  
Removal: disabling Preferences causes the Website to remove both the localStorage and cookie values.

## 5. Analytics storage

The following storage is used only after Analytics consent.

### avrash_analytics_session

Technology: sessionStorage  
Category: Analytics  
Purpose: stores a random UUID for the current tab/session. It is used to associate analytics events with one visit, calculate session-based statistics and funnels, enforce event limits, and support duplicate suppression.  
Lifetime: until the browser tab/session ends, subject to browser behaviour.  
Removal: withdrawing Analytics consent causes the Website to remove this key.

### avrash_analytics_seen

Technology: sessionStorage  
Category: Analytics  
Purpose: records recent eligible analytics interactions so repeated project_open, project_gallery_view, and works_filter events for the same identifier are not counted again for 30 minutes within the session.  
Lifetime: until the browser tab/session ends, subject to browser behaviour.  
Removal: withdrawing Analytics consent causes the Website to remove this key.

## 6. UTM campaign values

If an entry URL contains utm_source, utm_medium, utm_campaign, or utm_content, the Website may temporarily keep those permitted values in page memory so they can be attached to the first page-view event if Analytics consent is given.

Before Analytics consent, those UTM values are not written by the analytics implementation to cookies, localStorage, or sessionStorage. They disappear on reload if they have not been used. Other query parameters are not intentionally persisted by the custom analytics system.

## 7. Custom analytics and visitor measurement

After Analytics consent, the Website sends analytics events to its Cloudflare Worker. The custom analytics implementation does not use a persistent analytics cookie to create its daily visitor identifier.

Instead, the server transiently processes IP address and User-Agent with a secret salt and the current date to create a daily SHA-256-derived visitor identifier. The raw IP address and full User-Agent are not stored in the custom analytics database for that purpose, and the identifier changes each day.

Referrer data sent to the custom analytics system is reduced in the browser to an HTTP(S) origin and is normalized again by the worker before storage. Full referrer paths, queries, and fragments are not intentionally sent to the custom analytics endpoint.

## 8. Vercel Web Analytics and Speed Insights

Vercel Web Analytics and Vercel Speed Insights are conditionally loaded only after Analytics consent.

Vercel documents Web Analytics as first-party and cookie-free. Speed Insights collects real-user performance measurements. Although these services do not require the Website to place a traditional analytics cookie, the Website treats them as optional Analytics and does not load them before Analytics consent.

Vercel may process ordinary request, traffic, device, location-derived, and service information as described in its applicable privacy and data-processing documentation.

## 9. Consent and changing your choice

You can use the Website's privacy-preferences interface to control optional categories.

- Rejecting or withdrawing **Analytics** prevents future optional analytics collection by the Website and removes avrash_analytics_session and avrash_analytics_seen from sessionStorage.
- Rejecting or withdrawing **Preferences** removes the stored theme and preloader values from localStorage and cookies.
- **Necessary** storage cannot be disabled through the preference interface because it is used to remember the privacy choice itself or provide essential functionality explicitly requested by the user.

Withdrawal applies to future processing and does not retroactively invalidate processing that occurred while valid consent was active.

## 10. Browser controls

You can also delete cookies and website storage using your browser settings. Blocking all storage may prevent the Website from remembering your language, privacy, theme, or preloader choices and may cause those choices to be requested again.

## 11. Summary table

| Name | Technology | Category | Purpose | Typical lifetime |
| --- | --- | --- | --- | --- |
| avrash-privacy-preferences | localStorage | Necessary | Remember privacy choices | Until cleared/replaced |
| NEXT_LOCALE | Cookie | Necessary | Remember explicit language choice | Browser session |
| site-theme | localStorage + cookie | Preferences | Remember theme | Cookie up to 1 year |
| site:preloader / site-preloader | localStorage + cookie | Preferences | Avoid repeating intro/preloader | Cookie up to 1 year |
| avrash_analytics_session | sessionStorage | Analytics | Session analytics and controls | Tab/session |
| avrash_analytics_seen | sessionStorage | Analytics | 30-minute duplicate suppression | Tab/session |

## 12. Changes

We may update this Policy when browser-storage behaviour, Website functionality, providers, or legal requirements change. The date at the top identifies the current version.

## 13. Contact

Questions about cookies, storage, or privacy choices can be sent to:

Alona Avrash  
avrash.design@gmail.com
`;
