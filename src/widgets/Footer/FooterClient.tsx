"use client";

import type { CSSProperties } from "react";
import type { FooterContent } from "@/entities/footer/model/footer";
import type { Social } from "@/entities/social/model/social";
import { SocialLinks } from "@/entities/social/ui/SocialLinks";
import { siteConfig } from "@/shared/config/site.config";
import { Container } from "@/shared/ui";
import { useFooterAnimations } from "./useFooterAnimations";
import styles from "./Footer.module.scss";

interface FooterClientProps {
    footer: FooterContent;
    socials: Social[];
}

const LEGAL_STAGGER_STEP_MS = 20;

function LegalLinkText({ text }: { text: string }) {
    return (
        <span className={styles.legalText} aria-hidden="true">
            {Array.from(text).map((char, i) => (
                <span
                    key={i}
                    className={styles.legalCharCol}
                    style={{ "--stagger-delay": `${i * LEGAL_STAGGER_STEP_MS}ms` } as CSSProperties}
                >
                    <span className={styles.legalCharTop}>{char}</span>
                    <span className={styles.legalCharBottom}>{char}</span>
                </span>
            ))}
        </span>
    );
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

                        <SocialLinks
                            socials={socials}
                            ariaLabel="Social links"
                            variant="accent"
                            animateItems
                        />
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
                                    <a href={link.href}>
                                        <span className={styles.legalSrOnly}>{link.label}</span>
                                        <LegalLinkText text={link.label} />
                                    </a>
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
