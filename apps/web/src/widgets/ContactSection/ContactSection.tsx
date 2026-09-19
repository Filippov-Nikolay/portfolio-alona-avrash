"use client";

import { FormEvent, useEffect, useState, type CSSProperties } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { Social } from "@avrash/content-schema";
import { SocialLinks } from "@/entities/social/ui/SocialLinks";
import { submitContactForm } from "@/shared/api/contactService";
import { siteConfig } from "@/shared/config/site.config";
import { usePreloader } from "@/shared/providers";
import { Container, Section } from "@/shared/ui";
import { CountryCodeSelect } from "./CountryCodeSelect";
import { ContactToast } from "./ContactToast";
import { useContactSectionAnimations } from "./useContactSectionAnimations";
import styles from "./ContactSection.module.scss";

const TOAST_AUTO_DISMISS_MS = 6000;

type SubmitState = "idle" | "submitting" | "success" | "error";
const PLACEHOLDER_STAGGER_MS = 18;

function AnimatedPlaceholder({ text }: { text: string }) {
    return (
        <span className={styles.animatedPlaceholder} aria-hidden="true">
            {Array.from(text).map((character, index) => (
                <span
                    key={`${character}-${index}`}
                    className={styles.placeholderChar}
                    style={
                        {
                            "--placeholder-delay": `${index * PLACEHOLDER_STAGGER_MS}ms`,
                        } as CSSProperties
                    }
                >
                    <span className={styles.placeholderCharTop}>{character}</span>
                    <span className={styles.placeholderCharBottom}>{character}</span>
                </span>
            ))}
        </span>
    );
}

interface ContactSectionProps {
    socials: Social[];
}

export function ContactSection({ socials }: ContactSectionProps) {
    const t = useTranslations("contact");
    const locale = useLocale();
    const { isReady } = usePreloader();
    const sectionRef = useContactSectionAnimations(isReady);
    const [submitState, setSubmitState] = useState<SubmitState>("idle");

    useEffect(() => {
        if (submitState !== "success" && submitState !== "error") return;
        const timer = window.setTimeout(() => setSubmitState("idle"), TOAST_AUTO_DISMISS_MS);
        return () => window.clearTimeout(timer);
    }, [submitState]);

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
                <div className={styles.contactLayout}>
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
                                <div className={styles.control}>
                                    <input
                                        id="contact-name"
                                        name="name"
                                        type="text"
                                        placeholder={t("form.namePlaceholder")}
                                        autoComplete="name"
                                        required
                                    />
                                    <AnimatedPlaceholder text={t("form.namePlaceholder")} />
                                </div>
                            </div>

                            <div className={styles.field} data-contact-form-item>
                                <label htmlFor="contact-email">{t("form.email")}</label>
                                <div className={styles.control}>
                                    <input
                                        id="contact-email"
                                        name="email"
                                        type="email"
                                        placeholder={t("form.emailPlaceholder")}
                                        autoComplete="email"
                                        required
                                    />
                                    <AnimatedPlaceholder text={t("form.emailPlaceholder")} />
                                </div>
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
                                    <div className={styles.control}>
                                        <input
                                            name="phone"
                                            type="tel"
                                            inputMode="tel"
                                            aria-label={t("form.phone")}
                                            placeholder="123 456 789"
                                            autoComplete="tel-national"
                                        />
                                        <AnimatedPlaceholder text="123 456 789" />
                                    </div>
                                </div>
                            </fieldset>

                            <div className={styles.field} data-contact-form-item>
                                <label htmlFor="contact-message">{t("form.message")}</label>
                                <div className={`${styles.control} ${styles.textareaControl}`}>
                                    <textarea
                                        id="contact-message"
                                        name="message"
                                        placeholder={t("form.messagePlaceholder")}
                                        rows={7}
                                        required
                                    />
                                    <AnimatedPlaceholder text={t("form.messagePlaceholder")} />
                                </div>
                            </div>

                            <button
                                className={styles.submit}
                                type="submit"
                                disabled={submitState === "submitting"}
                                data-contact-form-item
                            >
                                {submitState === "submitting"
                                    ? t("form.sending")
                                    : t("form.submit")}
                            </button>
                        </form>

                        <ContactToast
                            status={
                                submitState === "success" || submitState === "error"
                                    ? submitState
                                    : null
                            }
                            message={submitState === "error" ? t("form.error") : t("form.success")}
                            onDismiss={() => setSubmitState("idle")}
                        />
                    </div>
                </div>
            </Container>
        </Section>
    );
}
