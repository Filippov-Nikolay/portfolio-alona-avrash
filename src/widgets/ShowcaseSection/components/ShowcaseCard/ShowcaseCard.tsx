import Image from "next/image";
import type { ShowcaseItem } from "@/shared/types";
import { TagList, ArrowIcon } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import { ACCENT_COLORS } from "@/shared/constants/colors";
import styles from "./ShowcaseCard.module.scss";

function initials(title: string): string {
    return title
        .split(" ")
        .filter(Boolean)
        .slice(0, 2)
        .map((w) => w[0])
        .join("")
        .toUpperCase();
}

interface ShowcaseCardProps {
    item: ShowcaseItem;
    isActive?: boolean;
    focusable?: boolean;
    viewLabel?: string;
    priority?: boolean;
    loading?: "eager" | "lazy";
}

export function ShowcaseCard({
    item,
    isActive,
    focusable = true,
    viewLabel = "View source",
    priority = false,
    loading,
}: ShowcaseCardProps) {
    const color = ACCENT_COLORS[item.color ?? "purple"];
    const mono = initials(item.title);

    return (
        <article
            className={cn(styles.card, isActive && styles.active)}
            style={
                {
                    "--c-hex": color.hex,
                    "--c-a08": color.a08,
                    "--c-a12": color.a12,
                    "--c-a14": color.a14,
                    "--c-a18": color.a18,
                    "--c-a22": color.a22,
                    "--c-a25": color.a25,
                } as React.CSSProperties
            }
            aria-label={item.title}
        >
            {/* Category badge */}
            {item.category && <div className={styles.badge}>{item.category}</div>}

            {/* Visual area */}
            <div className={styles.visual} aria-hidden="true">
                <div className={styles.visualGlow} />
                {item.src ? (
                    <Image
                        src={item.src}
                        alt=""
                        fill
                        className={styles.image}
                        sizes="(max-width: 480px) 340px, (max-width: 768px) 400px, 440px"
                        priority={priority}
                        loading={loading}
                        draggable={false}
                    />
                ) : (
                    <>
                        <div className={styles.visualRing} />
                        <span className={styles.mono}>{mono}</span>
                    </>
                )}
                <div className={styles.grid} />
            </div>

            {/* Content */}
            <div className={styles.content}>
                <h3 className={styles.title}>{item.title}</h3>
                {item.description && <p className={styles.description}>{item.description}</p>}

                {item.tags.length > 0 && (
                    <TagList tags={item.tags} limit={4} tagClassName={styles.cardTag} />
                )}

                {item.secondaryHref && (
                    <a
                        href={item.secondaryHref}
                        className={styles.repoBtn}
                        target="_blank"
                        rel="noopener noreferrer"
                        tabIndex={focusable ? 0 : -1}
                        draggable={false}
                        onDragStart={(e) => e.preventDefault()}
                    >
                        {viewLabel}
                        <ArrowIcon className={styles.arrow} />
                    </a>
                )}
            </div>
        </article>
    );
}
