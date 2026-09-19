"use client";

import { useId } from "react";
import styles from "./ColorField.module.css";

interface ColorFieldProps {
    label: string;
    value: string;
    onChange: (value: string) => void;
    allowEmpty?: boolean;
}

const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

export function ColorField({ label, value, onChange, allowEmpty }: ColorFieldProps) {
    const swatchValue = HEX_PATTERN.test(value) ? value : "#000000";
    const swatchId = useId();

    return (
        <div className={styles.field}>
            <label htmlFor={swatchId} className={styles.label}>
                {label}
            </label>
            <span className={styles.controls}>
                <input
                    id={swatchId}
                    type="color"
                    className={styles.swatch}
                    value={swatchValue}
                    onChange={(e) => onChange(e.target.value)}
                />
                <input
                    type="text"
                    className={styles.hex}
                    value={value}
                    aria-label={label}
                    placeholder={allowEmpty ? "unset" : "#000000"}
                    onChange={(e) => onChange(e.target.value)}
                />
            </span>
        </div>
    );
}
