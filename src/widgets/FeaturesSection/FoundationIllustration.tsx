export function FoundationIllustration() {
    const p = (a: number) => `rgba(234, 253, 39,${a})`;
    const mono = { fontFamily: "var(--font-geist-mono, monospace)" } as React.CSSProperties;

    return (
        <svg
            viewBox="0 0 360 254"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden="true"
            style={{ width: "92%", maxWidth: "390px" }}
        >
            {/* ── Level 1: Client ── */}
            <rect
                x="130"
                y="6"
                width="100"
                height="30"
                rx="6"
                fill={p(0.07)}
                stroke={p(0.22)}
                strokeWidth="1"
            />
            <text
                x="180"
                y="25"
                textAnchor="middle"
                fontSize="9"
                fontWeight="600"
                fill={p(0.68)}
                style={mono}
            >
                Client Browser
            </text>

            {/* connector 1→2 */}
            <circle cx="180" cy="36" r="2" fill={p(0.36)} />
            <line
                x1="180"
                y1="36"
                x2="180"
                y2="56"
                stroke={p(0.24)}
                strokeWidth="1"
                strokeDasharray="4 3"
            />

            {/* ── Level 2: Frontend ── */}
            <rect
                x="70"
                y="56"
                width="220"
                height="46"
                rx="8"
                fill={p(0.1)}
                stroke={p(0.32)}
                strokeWidth="1"
            />
            <text
                x="180"
                y="76"
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill={p(0.9)}
                style={mono}
            >
                Frontend
            </text>
            <text x="180" y="93" textAnchor="middle" fontSize="9" fill={p(0.52)} style={mono}>
                React · Next.js · TypeScript · SSR
            </text>

            {/* connector 2→3 */}
            <circle cx="180" cy="102" r="2" fill={p(0.4)} />
            <line
                x1="180"
                y1="102"
                x2="180"
                y2="122"
                stroke={p(0.28)}
                strokeWidth="1"
                strokeDasharray="4 3"
            />

            {/* ── Level 3: Backend ── */}
            <rect
                x="40"
                y="122"
                width="280"
                height="46"
                rx="8"
                fill={p(0.07)}
                stroke={p(0.24)}
                strokeWidth="1"
            />
            <text
                x="180"
                y="142"
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill={p(0.85)}
                style={mono}
            >
                Backend
            </text>
            <text x="180" y="159" textAnchor="middle" fontSize="9" fill={p(0.46)} style={mono}>
                Node.js · Express · REST API
            </text>

            {/* ── Fork to 3 branches ── */}
            <line
                x1="180"
                y1="168"
                x2="180"
                y2="182"
                stroke={p(0.22)}
                strokeWidth="1"
                strokeDasharray="4 3"
            />
            <line x1="60" y1="182" x2="300" y2="182" stroke={p(0.22)} strokeWidth="1" />
            <line
                x1="60"
                y1="182"
                x2="60"
                y2="196"
                stroke={p(0.22)}
                strokeWidth="1"
                strokeDasharray="4 3"
            />
            <line
                x1="180"
                y1="182"
                x2="180"
                y2="196"
                stroke={p(0.22)}
                strokeWidth="1"
                strokeDasharray="4 3"
            />
            <line
                x1="300"
                y1="182"
                x2="300"
                y2="196"
                stroke={p(0.22)}
                strokeWidth="1"
                strokeDasharray="4 3"
            />
            <circle cx="60" cy="196" r="2" fill={p(0.34)} />
            <circle cx="180" cy="196" r="2" fill={p(0.34)} />
            <circle cx="300" cy="196" r="2" fill={p(0.34)} />

            {/* ── Level 4a: Database ── */}
            <rect
                x="8"
                y="196"
                width="104"
                height="40"
                rx="7"
                fill={p(0.05)}
                stroke={p(0.18)}
                strokeWidth="1"
            />
            <text
                x="60"
                y="213"
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="600"
                fill={p(0.78)}
                style={mono}
            >
                PostgreSQL · MySQL
            </text>
            <text x="60" y="228" textAnchor="middle" fontSize="8" fill={p(0.38)} style={mono}>
                Database
            </text>

            {/* ── Level 4b: Cache / Queue ── */}
            <rect
                x="128"
                y="196"
                width="104"
                height="40"
                rx="7"
                fill={p(0.05)}
                stroke={p(0.18)}
                strokeWidth="1"
            />
            <text
                x="180"
                y="213"
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="600"
                fill={p(0.78)}
                style={mono}
            >
                Redis · RabbitMQ
            </text>
            <text x="180" y="228" textAnchor="middle" fontSize="8" fill={p(0.38)} style={mono}>
                Cache · Queue
            </text>

            {/* ── Level 4c: Infrastructure ── */}
            <rect
                x="248"
                y="196"
                width="104"
                height="40"
                rx="7"
                fill={p(0.05)}
                stroke={p(0.18)}
                strokeWidth="1"
            />
            <text
                x="300"
                y="213"
                textAnchor="middle"
                fontSize="9.5"
                fontWeight="600"
                fill={p(0.78)}
                style={mono}
            >
                Docker · Nginx
            </text>
            <text x="300" y="228" textAnchor="middle" fontSize="8" fill={p(0.38)} style={mono}>
                CI/CD · Linux
            </text>
        </svg>
    );
}
