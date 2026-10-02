"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    FolderKanban,
    House,
    LayoutDashboard,
    LogOut,
    MessageCircle,
    Settings2,
    type LucideIcon,
} from "lucide-react";
import type { BuildInfo as BuildInfoData } from "@/shared/config/buildInfo";
import { ADMIN_NAV } from "@/shared/config/nav";
import { cn } from "@/shared/lib/cn";
import { logoutAction } from "@/entities/session/api/actions";
import { BuildInfo } from "@/widgets/BuildInfo";
import styles from "./AdminNav.module.css";

interface AdminNavProps {
    buildInfo: BuildInfoData;
}

const PAGE_ICONS: Record<string, LucideIcon> = {
    dashboard: LayoutDashboard,
    home: House,
    works: FolderKanban,
    contact: MessageCircle,
    global: Settings2,
};

export function AdminNav({ buildInfo }: AdminNavProps) {
    const pathname = usePathname();
    const currentPageSlug = pathname.split("/")[1];
    const currentPage = ADMIN_NAV.find((page) => page.slug === currentPageSlug) ?? ADMIN_NAV[0];

    if (pathname === "/login") return null;

    return (
        <nav className={styles.nav}>
            <ul className={styles.pageTabs}>
                {ADMIN_NAV.map((page) => {
                    const Icon = PAGE_ICONS[page.slug] ?? LayoutDashboard;

                    return (
                        <li key={page.slug} className={styles.tabItem}>
                            {(page.slug === "home" || page.slug === "global") && (
                                <span className={styles.divider} aria-hidden="true" />
                            )}
                            <Link
                                href={`/${page.slug}/${page.sections[0].slug}`}
                                className={cn(
                                    styles.tab,
                                    page.slug === currentPage.slug && styles.tabActive
                                )}
                                title={page.label}
                            >
                                <Icon className={styles.navIcon} aria-hidden="true" />
                                <span className={styles.navLabel}>{page.label}</span>
                            </Link>
                        </li>
                    );
                })}
                <li className={cn(styles.tabItem, styles.logoutItem)}>
                    <form action={logoutAction}>
                        <button type="submit" className={styles.tab} title="Log out">
                            <LogOut className={styles.navIcon} aria-hidden="true" />
                            <span className={styles.navLabel}>Log out</span>
                        </button>
                    </form>
                </li>
                <li className={styles.tabItem}>
                    <BuildInfo data={buildInfo} />
                </li>
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
