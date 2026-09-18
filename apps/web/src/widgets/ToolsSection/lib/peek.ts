import type { CSSProperties } from "react";

export function peekStyle(index: number): CSSProperties {
    return {
        "--peek-x": `${30 * (index + 1)}px`,
        "--peek-y": `-${60 * (index + 1)}px`,
        "--peek-rotate": `${10 * (index + 1)}deg`,
        zIndex: -(index + 2),
    } as CSSProperties;
}

export function peekBlendSrc(src: string): string {
    return `/assets/tools/peek-blend/${src.split("/").pop()}`;
}
