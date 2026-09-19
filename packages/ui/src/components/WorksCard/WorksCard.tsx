import type { CSSProperties } from "react";
import Image from "next/image";
import type { Project } from "@avrash/content-schema";
import { Button } from "../Button";
import { ArrowIcon } from "../../icons";
import styles from "./WorksCard.module.scss";

export interface WorksCardProps {
    project: Project;
    rank: number;
    categoryLabel: string;
    viewLabel: string;
    onOpen: () => void;
    cardRef?: (el: HTMLDivElement | null) => void;
}

export function WorksCard({
    project,
    rank,
    categoryLabel,
    viewLabel,
    onOpen,
    cardRef,
}: WorksCardProps) {
    const heroImage = project.image.find((image) => image.isHero) ?? project.image[0];
    const year = new Date(project.createdAt).getFullYear();

    const hoverStyle = {
        "--hover-bg": project.hover.background,
        "--hover-accent": project.hover.accentColor,
        "--hover-btn-bg": project.hover.buttonBackground,
        "--hover-btn-text": project.hover.buttonTextColor,
    } as CSSProperties;

    return (
        <div ref={cardRef} className={styles.card} style={hoverStyle} onClick={onOpen}>
            <div className={styles.visual}>
                {heroImage?.src && (
                    <Image
                        src={heroImage.src}
                        alt={heroImage.alt ?? project.name}
                        fill
                        className={styles.image}
                        sizes="(max-width: 767px) 100vw, 45vw"
                    />
                )}
            </div>

            <div className={styles.info}>
                <div className={styles.infoTop}>
                    <span className={styles.rank}>{String(rank).padStart(2, "0")}</span>
                    <span className={styles.year}>{year}</span>
                </div>

                <div className={styles.infoBody}>
                    <h3 className={styles.cardTitle}>{project.name}</h3>
                    <p className={styles.cardSubtitle}>{categoryLabel}</p>
                </div>

                <Button
                    type="button"
                    variant="primary"
                    size="md"
                    className={styles.viewBtn}
                    rightIcon={<ArrowIcon className={styles.viewArrow} />}
                    onClick={(event) => {
                        event.stopPropagation();
                        onOpen();
                    }}
                >
                    {viewLabel}
                </Button>
            </div>
        </div>
    );
}
