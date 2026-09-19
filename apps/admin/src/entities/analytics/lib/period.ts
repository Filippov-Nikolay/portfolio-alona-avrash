export const PERIOD_OPTIONS = [
    { days: 7, label: "7D" },
    { days: 30, label: "30D" },
    { days: 90, label: "90D" },
    { days: 365, label: "1Y" },
] as const;

export type PeriodDays = (typeof PERIOD_OPTIONS)[number]["days"];

const ALLOWED_DAYS: readonly number[] = PERIOD_OPTIONS.map((option) => option.days);
const DEFAULT_DAYS: PeriodDays = 30;

export function parseDaysParam(raw: string | string[] | undefined): PeriodDays {
    const value = Number(Array.isArray(raw) ? raw[0] : raw);
    return ALLOWED_DAYS.includes(value) ? (value as PeriodDays) : DEFAULT_DAYS;
}
