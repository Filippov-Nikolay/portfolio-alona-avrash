export type FeatureGroupIcon = "monitor" | "codeV2" | "database" | "prompt" | "AiIDE";

// A group of related capabilities, e.g. "Frontend", "Backend", "Design".
// `prefix`/`suffix` split the title so part of it can be styled differently
// (e.g. bold vs. regular weight) — purely typographic, not semantic.
export interface FeatureGroup {
    id: string;
    prefix: string;
    suffix: string;
    icon: FeatureGroupIcon;
    items: string[];
}

export interface FeaturesI18n {
    intro: string;
    highlight: string;
    status: string;
    highlightTitle: string;
    highlightAccent: string;
    highlightDesc: string;
}

export interface FeaturesData {
    i18n: Record<string, FeaturesI18n>;
    highlightTags: string[];
    groups: FeatureGroup[];
}
