"use client";

import type { ButtonHTMLAttributes } from "react";
import { usePrivacyPreferences } from "../model/PrivacyPreferencesProvider";

interface ManagePreferencesButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

export function ManagePreferencesButton({ children, ...props }: ManagePreferencesButtonProps) {
    const { openPanel } = usePrivacyPreferences();

    return (
        <button type="button" onClick={openPanel} {...props}>
            {children}
        </button>
    );
}

ManagePreferencesButton.displayName = "ManagePreferencesButton";
