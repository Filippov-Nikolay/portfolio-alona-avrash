import type { CSSProperties } from "react";
import { getFooter } from "@/entities/footer/api/getFooter";
import { getSocials } from "@/entities/social/api/getSocials";
import { siteConfig } from "@/shared/config/site.config";
import { Container } from "@/shared/ui";
import styles from "./Footer.module.scss";

export async function Footer() {
    const [footer, socials] = await Promise.all([getFooter(), getSocials()]);
    const year = new Date().getFullYear();

    return (
        <footer className={styles.footer}>
            <Container>
                <div className={styles.top}>
                    <div className={styles.left}>
                        <p className={styles.tagline}>{footer.tagline}</p>

                        <ul className={styles.socials} aria-label="Social links">
                            {socials.map((social) => (
                                <li key={social.id}>
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

                    <div className={styles.right}>
                        <p className={styles.copyright}>
                            &copy;{year} {siteConfig.name}
                        </p>

                        <ul className={styles.legal}>
                            {footer.legalLinks.map((link) => (
                                <li key={link.id}>
                                    <a href={link.href}>{link.label}</a>
                                </li>
                            ))}
                        </ul>
                    </div>
                </div>
            </Container>

            <div className={styles.brandClip} aria-hidden="true">
                <p className={styles.brand}>{footer.brandMark}</p>
            </div>
        </footer>
    );
}
