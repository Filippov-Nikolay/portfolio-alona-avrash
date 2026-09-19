import { cn } from "@/shared/lib/cn";
import styles from "./ToggleChip.module.css";

interface ToggleChipProps {
    label: string;
    selected: boolean;
    onToggle: () => void;
}

export function ToggleChip({ label, selected, onToggle }: ToggleChipProps) {
    return (
        <button
            type="button"
            onClick={onToggle}
            className={cn(styles.chip, selected && styles.selected)}
            aria-pressed={selected}
        >
            {label}
        </button>
    );
}
