export const PRIVACY_POLICY_LAST_UPDATED = "September 27, 2026";

export const PRIVACY_POLICY_MARKDOWN = `
# Privacy Policy

Last updated: September 27, 2026

This Privacy Policy explains how Alona Avrash ("Alona Avrash", "we", "us", or "our") processes personal data when you visit or interact with the portfolio website available at avrash.com (the "Website").

## 1. Controller and contact

Controller / website operator: Alona Avrash  
Website: avrash.com  
Privacy contact: avrash.design@gmail.com

No company registration number, VAT number, postal business address, or Data Protection Officer is represented by this Policy unless separately published on the Website.

## 2. Scope

This Policy applies to personal data processed when you:

- browse the Website;
- view portfolio projects and galleries;
- use portfolio filters;
- follow project or social-media links;
- download a CV;
- use the contact form;
- choose privacy, language, theme, or preloader preferences; or
- consent to optional analytics.

Third-party websites reached through external links are governed by their own privacy notices.

## 3. Data we process

### 3.1 Essential website and network data

When you access the Website, hosting, content-delivery, security, and network providers may process ordinary request and technical data needed to deliver and protect the Website, such as IP address, request metadata, network/security information, and technical logs. Cloudflare and Vercel provide infrastructure used by the Website.

This processing is separate from the optional analytics described below. Refusing Analytics consent does not prevent infrastructure providers from processing data that is technically necessary to deliver and secure the Website.

### 3.2 Contact form

If you submit the contact form, the Website processes:

- name;
- email address;
- telephone number, if you choose to provide it;
- message;
- Website language; and
- submission time.

The Website application does not intentionally store contact-form submissions in its own application database. The submission is transmitted by email through Resend to the configured contact mailbox, with your email address used as the reply-to address. The resulting email may remain in the recipient's mailbox and may be processed by the relevant email-service infrastructure.

The contact endpoint also processes the requesting IP address transiently to enforce an in-memory rate limit of five attempts per ten minutes. The application does not write that IP address to its contact or analytics database through this rate-limit mechanism.

A hidden anti-bot field is used to reject automated submissions.

### 3.3 Optional first-party analytics

The Website operates its own analytics system. It is disabled until you consent to the Analytics category.

After consent, the Website may record the following event types:

- page views;
- project openings;
- project gallery views;
- clicks on external project links;
- portfolio category/filter selections;
- CV downloads;
- first interaction with the contact form;
- successful contact-form submissions; and
- social-media link clicks.

Depending on the event, the analytics record may contain:

- event type;
- project, category, or social-network identifier where relevant;
- page path without the query string;
- Website locale;
- a random session identifier stored for the current browser tab;
- country derived by Cloudflare from the network request;
- referrer origin only, for example https://www.google.com, rather than the full referring URL;
- server timestamp;
- a daily visitor identifier;
- broad device type, operating-system family, and browser family derived from User-Agent; and
- on the first page view, the permitted campaign fields utm_source, utm_medium, utm_campaign, and utm_content, each subject to a length limit.

The Website intentionally does not store the raw IP address, full User-Agent, browser or operating-system version, screen resolution, full URL query string, utm_term, gclid, fbclid, contact-form content, or a long-lived analytics visitor identifier in its analytics database.

### 3.4 Daily visitor identifier

To estimate unique visitors without placing a persistent analytics cookie, the analytics worker transiently processes the request IP address and User-Agent together with a secret salt and the current date. It creates a SHA-256-derived visitor identifier and stores only the first 16 bytes of the resulting identifier.

The raw IP address and full User-Agent are not stored in the analytics database for this purpose. Because the date is part of the input, the visitor identifier changes each day and is not designed to identify or follow a visitor across days.

### 3.5 Referrer information

For analytics, the browser reduces an HTTP or HTTPS referrer to its origin before transmission. The analytics worker normalizes it again before storage. For example, a referring URL containing a search path or query is stored only as its origin. Non-HTTP(S) and invalid referrers are discarded.

### 3.6 Campaign information

If the entry URL contains utm_source, utm_medium, utm_campaign, or utm_content, those values may be attached to the first page-view event after Analytics consent. Before consent, these values are kept only in page memory and are not written to persistent browser storage for analytics. Other query parameters are not intentionally stored by the custom analytics system.

### 3.7 Device, browser, and country information

Cloudflare may derive country from the network request. The analytics worker derives only broad device, operating-system, and browser categories from User-Agent. The full User-Agent is not stored in the analytics database.

## 4. Vercel Web Analytics and Speed Insights

If you consent to Analytics, the Website also enables Vercel Web Analytics and Vercel Speed Insights.

Vercel Web Analytics provides traffic information such as page views, referrers, country, device/browser information, and related aggregate website-usage insights. Vercel describes its Web Analytics as first-party and cookie-free and documents use of generated hashes for visitor measurement.

Vercel Speed Insights measures real-user performance information, including Web Vitals and related performance metrics such as LCP, CLS, INP, FCP, and TTFB where supported.

These Vercel components are not loaded by the Website before Analytics consent. Vercel's own processing, security, retention, and international-transfer practices are governed by its applicable service terms, privacy documentation, and data-processing terms.

## 5. Purposes and legal bases

Where the EU General Data Protection Regulation (GDPR) applies, we rely on the following legal bases as appropriate:

### 5.1 Consent — Article 6(1)(a) GDPR

We rely on consent for optional Analytics processing initiated by the Website, including the custom analytics system and the conditional Vercel Web Analytics and Speed Insights components.

You may refuse Analytics without losing access to the core Website. You may withdraw consent for the future through the Website's privacy preferences. Withdrawal does not affect the lawfulness of processing that occurred before withdrawal.

### 5.2 Steps at your request / legitimate interests — Articles 6(1)(b) and 6(1)(f) GDPR, as applicable

When you voluntarily submit the contact form, we process the information necessary to receive, evaluate, and respond to your enquiry and, where relevant, to take steps at your request before entering into a professional engagement.

We may also rely on legitimate interests for proportionate anti-abuse and security measures, including rate limiting and protection of the Website and contact endpoint, where those interests are not overridden by your rights and interests.

### 5.3 Necessary service operation — Article 6(1)(f) GDPR and other applicable bases

Necessary technical processing may occur to deliver, secure, troubleshoot, and maintain the Website. Depending on the context and provider, such processing may be performed by service providers on our behalf and/or under their own applicable legal obligations.

## 6. Cookies and similar browser storage

The Website uses cookies, localStorage, sessionStorage, and short-lived in-memory state. Necessary storage is used for privacy choices and, where applicable, language selection. Preference storage is used for optional theme and preloader choices. Analytics session storage is used only after Analytics consent.

Details, names, purposes, and lifetimes are provided in the Cookie & Browser Storage Policy.

## 7. Service providers and recipients

We use service providers to operate the Website. Depending on your interaction, personal data may be processed by:

- Cloudflare — network delivery, security, Workers, and D1 infrastructure used by the custom analytics system;
- Vercel — Website hosting and, after Analytics consent, Web Analytics and Speed Insights;
- Resend (Plus Five Five, Inc.) — transmission of contact-form email; and
- the email provider used by the Website operator to receive and respond to contact messages.

We do not state that these providers receive every category of data described in this Policy. Their processing depends on the service involved and your interaction with the Website.

## 8. International transfers

Some service providers are established in, or may process data from, countries outside the European Economic Area.

Where GDPR transfer restrictions apply, providers may rely on mechanisms such as adequacy decisions, the EU-U.S. Data Privacy Framework where applicable, Standard Contractual Clauses, and supplementary safeguards described in their contractual/privacy documentation.

Cloudflare's current Data Processing Addendum provides for applicable transfer mechanisms, including EU Standard Contractual Clauses for restricted transfers. Vercel and Resend also publish data-processing terms addressing international processing and transfers.

## 9. Retention

### 9.1 Custom analytics

Custom analytics events in Cloudflare D1 are automatically deleted when they are older than 730 days. A scheduled job performs this cleanup daily.

The daily visitor identifier itself changes each day by design. Analytics session identifiers stored in the browser last only for the browser-tab session.

### 9.2 Contact enquiries

The Website application does not maintain its own database of contact-form submissions. Contact messages transmitted by email may be retained in the operator's mailbox for as long as reasonably necessary to respond, maintain relevant professional correspondence, establish or defend legal claims, or comply with applicable obligations. Provider-side retention may also apply under the relevant provider's terms.

### 9.3 Provider data

Infrastructure, security, Web Analytics, Speed Insights, email-delivery, backup, and service logs maintained by Cloudflare, Vercel, Resend, or other providers may follow provider-specific retention periods. We do not represent those periods as identical to the Website's 730-day D1 analytics retention period.

## 10. Data minimisation and security

The Website is designed to limit analytics data collection. In particular:

- optional analytics is consent-gated;
- full referrer URLs are not sent to the custom analytics endpoint;
- raw IP addresses and full User-Agents are not stored in the custom analytics database;
- the custom visitor identifier rotates daily;
- analytics read endpoints are protected by a secret bearer token;
- analytics ingestion checks the permitted Website origin;
- automated/bot traffic is filtered by the custom analytics worker;
- per-session event rate limits and duplicate controls are applied; and
- raw person-level analytics events are not exposed through the normal admin interface.

No internet service can guarantee absolute security.

## 11. Your rights

Where GDPR or comparable law applies, you may have rights including:

- access to personal data concerning you;
- correction of inaccurate data;
- deletion in applicable circumstances;
- restriction of processing;
- objection to processing based on legitimate interests;
- data portability where the legal requirements are met;
- withdrawal of consent at any time for future consent-based processing; and
- the right to lodge a complaint with a competent data-protection supervisory authority.

Because the custom analytics system deliberately avoids long-lived identity data, it may not always be technically possible to link a particular analytics record to you after the fact based only on information you provide in a rights request. We will not collect additional identifying information merely to identify you where applicable law does not require us to do so.

To exercise a privacy right, contact avrash.design@gmail.com. We may need information reasonably necessary to verify and handle the request.

## 12. Privacy choices

You can use the Website's privacy-preferences controls to accept or reject optional categories. Analytics is not enabled until you consent to it. Withdrawing Analytics consent removes the Website's analytics sessionStorage keys and prevents future optional analytics collection by the Website unless you consent again.

Withdrawing Preferences removes the Website's stored theme and preloader preference values. Necessary storage used to remember the privacy choice itself and necessary language selection may remain.

## 13. Children

The Website is a professional portfolio and is not directed specifically to children. We do not knowingly use the optional analytics system for the purpose of profiling children. If you believe a child has submitted personal information that should be removed, contact us.

## 14. Changes to this Policy

We may update this Policy when the Website, its providers, or applicable legal requirements change. The "Last updated" date identifies the current version. Material changes may also be reflected through the Website's privacy-preference interface where appropriate.

## 15. Contact

For questions about this Policy or the Website's processing of personal data, contact:

Alona Avrash  
avrash.design@gmail.com
`;
