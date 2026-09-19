"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OptionItem } from "@/entities/optionList/api/optionListRepository";
import { Button } from "@/shared/ui/Button";
import styles from "./OptionListManager.module.css";

interface OptionListManagerProps {
    options: OptionItem[];
    itemNoun: string;
    addAction: (label: string) => Promise<OptionItem>;
    removeAction: (key: string) => Promise<void>;
}

export function OptionListManager({
    options,
    itemNoun,
    addAction,
    removeAction,
}: OptionListManagerProps) {
    const router = useRouter();
    const [label, setLabel] = useState("");
    const [adding, setAdding] = useState(false);
    const [addError, setAddError] = useState<string | null>(null);
    const [removingKey, setRemovingKey] = useState<string | null>(null);
    const [removeError, setRemoveError] = useState<string | null>(null);
    const [confirmingKey, setConfirmingKey] = useState<string | null>(null);

    async function handleAdd(e: React.FormEvent) {
        e.preventDefault();
        if (!label.trim()) return;

        setAdding(true);
        setAddError(null);
        try {
            await addAction(label);
            setLabel("");
            router.refresh();
        } catch (err) {
            setAddError(err instanceof Error ? err.message : "Could not add that.");
        } finally {
            setAdding(false);
        }
    }

    async function handleRemove(key: string) {
        setRemovingKey(key);
        setRemoveError(null);
        try {
            await removeAction(key);
            router.refresh();
        } catch (err) {
            setRemoveError(err instanceof Error ? err.message : "Could not remove that.");
        } finally {
            setRemovingKey(null);
            setConfirmingKey(null);
        }
    }

    return (
        <div className={styles.wrap}>
            <form className={styles.addForm} onSubmit={handleAdd}>
                <input
                    className={styles.input}
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={`New ${itemNoun} name`}
                />
                <Button variant="primary" type="submit" disabled={adding || !label.trim()}>
                    {adding ? "Adding..." : "Add"}
                </Button>
            </form>
            {addError && <p className={styles.error}>{addError}</p>}

            <ul className={styles.list}>
                {options.map((option) => (
                    <li key={option.key} className={styles.row}>
                        <span className={styles.label}>{option.label}</span>
                        <span className={styles.key}>{option.key}</span>

                        {confirmingKey === option.key ? (
                            <span className={styles.confirm}>
                                Remove?
                                <Button
                                    variant="danger"
                                    onClick={() => handleRemove(option.key)}
                                    disabled={removingKey === option.key}
                                >
                                    {removingKey === option.key ? "..." : "Yes"}
                                </Button>
                                <Button variant="ghost" onClick={() => setConfirmingKey(null)}>
                                    No
                                </Button>
                            </span>
                        ) : (
                            <Button variant="ghost" onClick={() => setConfirmingKey(option.key)}>
                                Remove
                            </Button>
                        )}
                    </li>
                ))}
            </ul>
            {removeError && <p className={styles.error}>{removeError}</p>}
        </div>
    );
}
