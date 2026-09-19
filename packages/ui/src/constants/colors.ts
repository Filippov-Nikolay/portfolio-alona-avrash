export type AccentColor = "orange" | "blue" | "purple" | "red";

interface AccentColorShades {
    hex: string;
    a08: string;
    a12: string;
    a14: string;
    a18: string;
    a22: string;
    a25: string;
}

// Shared accent palette for showcase/gallery cards, badges and CTA
// highlights. Each color exposes a few pre-mixed alpha levels so
// components don't have to compute `rgba(...)` inline.
export const ACCENT_COLORS: Record<AccentColor, AccentColorShades> = {
    orange: {
        hex: "#f97316",
        a08: "rgba(249,115,22,0.08)",
        a12: "rgba(249,115,22,0.12)",
        a14: "rgba(249,115,22,0.14)",
        a18: "rgba(249,115,22,0.18)",
        a22: "rgba(249,115,22,0.22)",
        a25: "rgba(249,115,22,0.25)",
    },
    blue: {
        hex: "#3b82f6",
        a08: "rgba(59,130,246,0.08)",
        a12: "rgba(59,130,246,0.12)",
        a14: "rgba(59,130,246,0.14)",
        a18: "rgba(59,130,246,0.18)",
        a22: "rgba(59,130,246,0.22)",
        a25: "rgba(59,130,246,0.25)",
    },
    purple: {
        hex: "#7c3aed",
        a08: "rgba(124,58,237,0.08)",
        a12: "rgba(124,58,237,0.12)",
        a14: "rgba(124,58,237,0.14)",
        a18: "rgba(124,58,237,0.18)",
        a22: "rgba(124,58,237,0.22)",
        a25: "rgba(124,58,237,0.25)",
    },
    red: {
        hex: "#ef4444",
        a08: "rgba(239,68,68,0.08)",
        a12: "rgba(239,68,68,0.12)",
        a14: "rgba(239,68,68,0.14)",
        a18: "rgba(239,68,68,0.18)",
        a22: "rgba(239,68,68,0.22)",
        a25: "rgba(239,68,68,0.25)",
    },
};
