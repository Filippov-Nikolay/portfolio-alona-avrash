"use client";

import { useState } from "react";
import type { OptionItem } from "@/entities/optionList/api/optionListRepository";
import { ToggleChip } from "@/shared/ui/ToggleChip";
import { Button } from "@/shared/ui/Button";
import styles from "./ChipsField.module.css";

interface ChipsFieldProps {
    options: OptionItem[];
    selected: string[];
    onToggle: (key: string) => void;
    onAdd: (label: string) => Promise<OptionItem>;
    onAdded: (option: OptionItem) => void;
    addNoun: string;
}

export function ChipsField({
    options,
    selected,
    onToggle,
    onAdd,
    onAdded,
    addNoun,
}: ChipsFieldProps) {
    const [isAdding, setIsAdding] = useState(false);
    const [label, setLabel] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleAdd() {
        if (!label.trim()) return;

        setSaving(true);
        setError(null);
        try {
            const option = await onAdd(label);
            onAdded(option);
            setLabel("");
            setIsAdding(false);
        } catch (err) {
            setError(err instanceof Error ? err.message : "Could not add that.");
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className={styles.wrap}>
            <div className={styles.chips}>
                {options.map((option) => (
                    <ToggleChip
                        key={option.key}
                        label={option.label}
                        selected={selected.includes(option.key)}
                        onToggle={() => onToggle(option.key)}
                    />
                ))}

                {isAdding ? (
                    <div className={styles.addForm}>
                        <input
                            autoFocus
                            className={styles.addInput}
                            value={label}
                            onChange={(e) => setLabel(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                    e.preventDefault();
                                    handleAdd();
                                } else if (e.key === "Escape") {
                                    setIsAdding(false);
                                    setError(null);
                                    setLabel("");
                                }
                            }}
                            placeholder={`New ${addNoun}`}
                        />
                        <Button
                            variant="primary"
                            onClick={handleAdd}
                            disabled={saving || !label.trim()}
                        >
                            {saving ? "..." : "Add"}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => {
                                setIsAdding(false);
                                setError(null);
                                setLabel("");
                            }}
                            disabled={saving}
                        >
                            Cancel
                        </Button>
                    </div>
                ) : (
                    <button
                        type="button"
                        className={styles.addTrigger}
                        onClick={() => setIsAdding(true)}
                        aria-label={`Add new ${addNoun}`}
                        title={`Add new ${addNoun}`}
                    >
                        +
                    </button>
                )}
            </div>
            {error && <p className={styles.error}>{error}</p>}
        </div>
    );
}
