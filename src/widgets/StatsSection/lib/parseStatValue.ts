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

export function formatStatValue(current: number, parsed: ParsedStatValue): string {
    const [intPart, decPart] = current.toFixed(parsed.decimals).split(".");
    const formattedInt = parsed.useThousandsSeparator
        ? Number(intPart).toLocaleString("en-US")
        : intPart;

    return `${parsed.prefix}${formattedInt}${decPart ? `.${decPart}` : ""}${parsed.suffix}`;
}
