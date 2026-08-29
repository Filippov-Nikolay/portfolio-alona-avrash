export type TimelineIcon = "stack" | "codeV2" | "database" | "prompt" | "monitor";

// Generic timeline entry — works equally well for a company history,
// a product changelog/roadmap, or (if you're building a portfolio)
// a work-experience list. `title`/`subtitle` are locale-independent
// labels shown as-is; `role`/`meta`/`description` are translated per locale.
export interface TimelineEntry {
    id: string;
    title: string;
    color: string;
    icon: TimelineIcon;
    startDate: string;
    endDate: string | null;
    subtitle: Record<string, string>;
    meta: Record<string, string>;
    description: Record<string, string>;
    tags: string[];
}

export interface TimelineI18n {
    title: string;
    subtitle: string;
    present: string;
}

export interface TimelineData {
    i18n: Record<string, TimelineI18n>;
    entries: TimelineEntry[];
}
