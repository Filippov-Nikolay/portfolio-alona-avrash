"use client";

import { FormEvent, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Social } from "@/entities/social/model/social";
import { SocialLinks } from "@/entities/social/ui/SocialLinks";
import { submitContactForm } from "@/shared/api/contactService";
import { siteConfig } from "@/shared/config/site.config";
import { usePreloader } from "@/shared/providers";
import { Container, Section } from "@/shared/ui";
import { CountryCodeSelect } from "./CountryCodeSelect";
import { useContactSectionAnimations } from "./useContactSectionAnimations";
import styles from "./ContactSection.module.scss";

type SubmitState = "idle" | "submitting" | "success" | "error";

interface ContactSectionProps {
    socials: Social[];
}

export function ContactSection({ socials }: ContactSectionProps) {
    const t = useTranslations("contact");
    const locale = useLocale();
    const { isReady } = usePreloader();
    const sectionRef = useContactSectionAnimations(isReady);
    const [submitState, setSubmitState] = useState<SubmitState>("idle");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        const form = event.currentTarget;

        if (!form.reportValidity()) return;

        const formData = new FormData(form);
        const countryCode = String(formData.get("countryCode") ?? "").trim();
        const phoneNumber = String(formData.get("phone") ?? "").trim();

        setSubmitState("submitting");

        try {
            await submitContactForm({
                name: String(formData.get("name") ?? "").trim(),
                email: String(formData.get("email") ?? "").trim(),
                phone: [countryCode, phoneNumber].filter(Boolean).join(" ") || undefined,
                message: String(formData.get("message") ?? "").trim(),
                locale,
                submittedAt: new Date().toISOString(),
            });

            form.reset();
            setSubmitState("success");
        } catch {
            setSubmitState("error");
        }
    }

    const email = siteConfig.links.email.replace(/^mailto:/, "");

    return (
        <Section ref={sectionRef} id="contact" className={styles.section}>
            <Container>
                <div className={styles.introGrid}>
                    <h1 className={styles.title} data-contact-title>
                        {t("title")}
                    </h1>
                    <p className={styles.intro} data-contact-intro>
                        {t("intro")}
                    </p>
                </div>

                <div className={styles.contentGrid}>
                    <aside className={styles.details}>
                        <div className={styles.timeline} data-contact-line aria-hidden="true">
                            <span data-contact-dot />
                        </div>

                        <div className={styles.availability} data-contact-detail>
                            <h2>{t("availability.title")}</h2>
                            <ul>
                                <li data-contact-service>{t("availability.branding")}</li>
                                <li data-contact-service>{t("availability.packaging")}</li>
                                <li data-contact-service>{t("availability.digital")}</li>
                                <li data-contact-service>{t("availability.direction")}</li>
                            </ul>
                        </div>

                        <div className={styles.talk} data-contact-detail>
                            <h2>{t("talk")}</h2>
                            <a className={styles.email} href={siteConfig.links.email}>
                                {email}
                            </a>

                            <SocialLinks
                                socials={socials}
                                ariaLabel={t("socialsLabel")}
                                variant="accent"
                                className={styles.socials}
                            />
                        </div>
                    </aside>

                    <form
                        className={styles.form}
                        onSubmit={handleSubmit}
                        data-contact-form
                        noValidate
                    >
                        <div className={styles.field} data-contact-form-item>
                            <label htmlFor="contact-name">{t("form.name")}</label>
                            <input
                                id="contact-name"
                                name="name"
                                type="text"
                                placeholder={t("form.namePlaceholder")}
                                autoComplete="name"
                                required
                            />
                        </div>

                        <div className={styles.field} data-contact-form-item>
                            <label htmlFor="contact-email">{t("form.email")}</label>
                            <input
                                id="contact-email"
                                name="email"
                                type="email"
                                placeholder={t("form.emailPlaceholder")}
                                autoComplete="email"
                                required
                            />
                        </div>

                        <fieldset className={styles.phoneField} data-contact-form-item>
                            <legend>
                                <span>{t("form.phone")}</span>
                                <span>{t("form.optional")}</span>
                            </legend>
                            <div className={styles.phoneInputs}>
                                <CountryCodeSelect
                                    locale={locale}
                                    label={t("form.countryCode")}
                                    searchPlaceholder={t("form.countrySearch")}
                                    noResultsLabel={t("form.noCountries")}
                                />
                                <input
                                    name="phone"
                                    type="tel"
                                    inputMode="tel"
                                    aria-label={t("form.phone")}
                                    placeholder="123 456 789"
                                    autoComplete="tel-national"
                                />
                            </div>
                        </fieldset>

                        <div className={styles.field} data-contact-form-item>
                            <label htmlFor="contact-message">{t("form.message")}</label>
                            <textarea
                                id="contact-message"
                                name="message"
                                placeholder={t("form.messagePlaceholder")}
                                rows={7}
                                required
                            />
                        </div>

                        <button
                            className={styles.submit}
                            type="submit"
                            disabled={submitState === "submitting"}
                            data-contact-form-item
                        >
                            {submitState === "submitting" ? t("form.sending") : t("form.submit")}
                        </button>

                        <p className={styles.status} aria-live="polite">
                            {submitState === "success" && t("form.success")}
                            {submitState === "error" && t("form.error")}
                        </p>
                    </form>
                </div>
            </Container>
        </Section>
    );
}
