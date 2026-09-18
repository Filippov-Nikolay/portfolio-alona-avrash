"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ADMIN_NAV } from "@/shared/config/nav";
import { cn } from "@/shared/lib/cn";
import styles from "./AdminNav.module.css";

export function AdminNav() {
    const pathname = usePathname();
    const currentPageSlug = pathname.split("/")[1];
    const currentPage = ADMIN_NAV.find((page) => page.slug === currentPageSlug) ?? ADMIN_NAV[0];

    return (
        <nav className={styles.nav}>
            <ul className={styles.pageTabs}>
                {ADMIN_NAV.map((page) => (
                    <li key={page.slug}>
                        <Link
                            href={`/${page.slug}/${page.sections[0].slug}`}
                            className={cn(
                                styles.tab,
                                page.slug === currentPage.slug && styles.tabActive
                            )}
                        >
                            {page.label}
                        </Link>
                    </li>
                ))}
            </ul>

            <ul className={styles.sectionTabs}>
                {currentPage.sections.map((section) => {
                    const href = `/${currentPage.slug}/${section.slug}`;
                    const isActive = pathname === href;

                    return (
                        <li key={section.slug}>
                            <Link
                                href={href}
                                className={cn(styles.subtab, isActive && styles.subtabActive)}
                            >
                                {section.label}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </nav>
    );
}
