export interface ParsedStatValue {
    prefix: string;
    suffix: string;
    target: number;
    decimals: number;
    useThousandsSeparator: boolean;
    isAnimatable: boolean;
}

const STAT_VALUE_PATTERN = /^(\D*)([\d,]*\.?\d+)(.*)$/;

export function parseStatValue(raw: string): ParsedStatValue {
    const match = raw.match(STAT_VALUE_PATTERN);

    if (!match) {
        return {
            prefix: "",
            suffix: raw,
            target: 0,
            decimals: 0,
            useThousandsSeparator: false,
            isAnimatable: false,
        };
    }

    const [, prefix, numeric, suffix] = match;
    const useThousandsSeparator = numeric.includes(",");
    const cleanNumeric = numeric.replace(/,/g, "");
    const dotIndex = cleanNumeric.indexOf(".");
    const decimals = dotIndex === -1 ? 0 : cleanNumeric.length - dotIndex - 1;

    return {
        prefix,
        suffix,
        target: Number(cleanNumeric),
        decimals,
        useThousandsSeparator,
        isAnimatable: true,
    };
}

export type DigitToken =
    { type: "digit"; place: number; continuous: boolean } | { type: "char"; value: string };

export function buildDigitPlan(parsed: ParsedStatValue): DigitToken[] {
    const intDigitCount = Math.max(1, Math.trunc(Math.abs(parsed.target)).toString().length);
    const tokens: DigitToken[] = [];

    for (let i = 0; i < intDigitCount; i++) {
        const place = intDigitCount - 1 - i;
        if (parsed.useThousandsSeparator && i > 0 && place % 3 === 2) {
            tokens.push({ type: "char", value: "," });
        }
        tokens.push({ type: "digit", place, continuous: false });
    }

    if (parsed.decimals > 0) {
        tokens.push({ type: "char", value: "." });
        for (let d = 1; d <= parsed.decimals; d++) {
            tokens.push({ type: "digit", place: -d, continuous: false });
        }
    }

    for (let i = tokens.length - 1; i >= 0; i--) {
        const token = tokens[i];
        if (token.type === "digit") {
            token.continuous = true;
            break;
        }
    }

    return tokens;
}

export function digitWheelPosition(value: number, place: number, continuous: boolean): number {
    const scaled = place >= 0 ? value / 10 ** place : value * 10 ** -place;
    const wrapped = ((scaled % 10) + 10) % 10;
    return continuous ? wrapped : Math.floor(wrapped);
}
