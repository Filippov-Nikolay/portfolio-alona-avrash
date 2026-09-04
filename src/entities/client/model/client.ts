export type MarqueeDirection = "left" | "right";
export type ClientPillVariant = "outline" | "filled" | "light";

export interface Client {
    id: number;
    name: string;
    variant: ClientPillVariant;
}

export interface ClientsRow {
    direction: MarqueeDirection;
    speed: number;
    leadingGap: boolean;
    clients: Client[];
}

export interface ClientsConfig {
    rows: ClientsRow[];
}
