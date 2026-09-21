const FLAG_FONT_STACK =
    '"Twemoji Country Flags", "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

interface CountryFlagProps {
    code: string;
    className: string;
}

function countryCodeToFlag(code: string): string | null {
    const normalizedCode = code.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalizedCode)) return null;

    return String.fromCodePoint(
        ...Array.from(normalizedCode, (letter) => 127397 + letter.charCodeAt(0))
    );
}

export function CountryFlag({ code, className }: CountryFlagProps) {
    const normalizedCode = code.trim().toUpperCase();
    const flag = countryCodeToFlag(normalizedCode);

    return (
        <span
            className={className}
            aria-hidden="true"
            style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: FLAG_FONT_STACK,
                fontSize: flag ? "15px" : "9px",
                lineHeight: 1,
            }}
        >
            {flag ?? (normalizedCode.slice(0, 2) || "--")}
        </span>
    );
}
