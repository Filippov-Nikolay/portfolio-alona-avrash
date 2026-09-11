"use client";

import type { CSSProperties } from "react";
import type { FooterContent } from "@/entities/footer/model/footer";
import type { Social } from "@/entities/social/model/social";
import { siteConfig } from "@/shared/config/site.config";
import { Container } from "@/shared/ui";
import { useFooterAnimations } from "./useFooterAnimations";
import styles from "./Footer.module.scss";

interface FooterClientProps {
    footer: FooterContent;
    socials: Social[];
}

export function FooterClient({ footer, socials }: FooterClientProps) {
    const { sectionRef, leftRef, rightRef, brandRef } = useFooterAnimations();
    const year = new Date().getFullYear();

    return (
        <footer ref={sectionRef} className={styles.footer}>
            <Container>
                <div className={styles.top}>
                    <div ref={leftRef} className={styles.left}>
                        <p className={styles.tagline}>
                            <span className={styles.maskLineInner} data-footer-mask>
                                {footer.tagline}
                            </span>
                        </p>

                        <ul className={styles.socials} aria-label="Social links">
                            {socials.map((social) => (
                                <li
                                    key={social.id}
                                    className={styles.socialItem}
                                    data-footer-social-item
                                >
                                    <a
                                        href={social.link}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        aria-label={social.logo.alt ?? social.id}
                                        className={styles.socialLink}
                                        style={
                                            {
                                                "--social-icon": `url(${social.logo.src})`,
                                            } as CSSProperties
                                        }
                                    >
                                        <span className={styles.socialIcon} aria-hidden="true" />
                                    </a>
                                </li>
                            ))}
                        </ul>
                    </div>

                    <div ref={rightRef} className={styles.right}>
                        <p className={styles.copyright}>
                            <span className={styles.maskLineInner} data-footer-mask>
                                &copy;{year} {siteConfig.name}
                            </span>
                        </p>

                        <ul className={styles.legal}>
                            {footer.legalLinks.map((link) => (
                                <li
                                    key={link.id}
                                    className={styles.legalItem}
                                    data-footer-legal-item
                                >
                                    <a href={link.href}>{link.label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Container>

            <div className={styles.brandClip} aria-hidden="true">
                <p ref={brandRef} className={styles.brand}>
                    {[...footer.brandMark].map((char, index) => (
                        <span key={index} className={styles.brandChar} data-footer-char>
                            {char}
                        </span>
                    ))}
                </p>
            </div>
        </footer>
    );
}
