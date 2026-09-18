"use client";

import type { Ref } from "react";
import { Container, Section } from "@/shared/ui";
import { cn } from "@/shared/lib/cn";
import type { Client, ClientsRow, MarqueeDirection } from "@avrash/content-schema";
import { useClientsSectionAnimations } from "./useClientsSectionAnimations";
import styles from "./ClientsSection.module.scss";

type PillSlot =
    | { kind: "empty"; key: string; width: "sm" | "md" | "lg" }
    | { kind: "client"; key: string; client: Client };
const EMPTY_WIDTHS: Array<"sm" | "md" | "lg"> = ["md", "sm", "lg", "sm"];

function buildRow(clients: Client[], leadingGap: boolean): PillSlot[] {
    const slots: PillSlot[] = [];

    clients.forEach((client, i) => {
        if (i > 0 || leadingGap) {
            slots.push({
                kind: "empty",
                key: `gap-${client.id}`,
                width: EMPTY_WIDTHS[slots.length % EMPTY_WIDTHS.length],
            });
        }
        slots.push({ kind: "client", key: String(client.id), client });
    });

    if (leadingGap && clients.length > 0) {
        slots.push({
            kind: "empty",
            key: "gap-tail",
            width: EMPTY_WIDTHS[slots.length % EMPTY_WIDTHS.length],
        });
    }

    return slots;
}

function ClientsRow({
    slots,
    direction,
    rowRef,
    trackRef,
}: {
    slots: PillSlot[];
    direction: MarqueeDirection;
    rowRef: Ref<HTMLDivElement>;
    trackRef: Ref<HTMLDivElement>;
}) {
    return (
        <div ref={rowRef} className={styles.row} data-direction={direction}>
            <div ref={trackRef} className={styles.track}>
                {Array.from({ length: 6 }, (_, cycle) => (
                    <div key={cycle} className={styles.sequence} aria-hidden={cycle > 0}>
                        {slots.map((slot) =>
                            slot.kind === "client" ? (
                                <span
                                    key={`${cycle}-${slot.key}`}
                                    className={cn(styles.pill, styles[slot.client.variant])}
                                >
                                    {slot.client.name}
                                </span>
                            ) : (
                                <span
                                    key={`${cycle}-${slot.key}`}
                                    className={cn(
                                        styles.pill,
                                        styles.pillEmpty,
                                        styles[slot.width]
                                    )}
                                    aria-hidden="true"
                                />
                            )
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

interface ClientsSectionLabels {
    label: string;
}

interface ClientsSectionProps {
    rows: ClientsRow[];
    labels: ClientsSectionLabels;
}

export function ClientsSection({ rows, labels }: ClientsSectionProps) {
    const { sectionRef, labelRef, setRowRef, setTrackRef } = useClientsSectionAnimations(rows);

    if (rows.length === 0) {
        return null;
    }

    return (
        <Section id="clients" ref={sectionRef} className={styles.section}>
            <div className={styles.rows}>
                {rows.map((row, index) => (
                    <ClientsRow
                        key={`${row.direction}-${index}`}
                        rowRef={setRowRef(index)}
                        trackRef={setTrackRef(index)}
                        slots={buildRow(row.clients, row.leadingGap)}
                        direction={row.direction}
                    />
                ))}
            </div>
        </Section>
    );
}
