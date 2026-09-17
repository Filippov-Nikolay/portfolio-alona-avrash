"use client";

import { KeyboardEvent, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, m, useReducedMotion } from "framer-motion";
import { getCountries, getCountryCallingCode, type CountryCode } from "libphonenumber-js";
import styles from "./ContactSection.module.scss";

interface CountryCodeSelectProps {
    locale: string;
    label: string;
    searchPlaceholder: string;
    noResultsLabel: string;
}

interface CountryOption {
    country: CountryCode;
    name: string;
    callingCode: string;
}

function normalizeSearch(value: string) {
    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLocaleLowerCase();
}

const FLAG_OFFSET = 127397;
const DROPDOWN_EASE = [0.16, 1, 0.3, 1] as const;
const DROPDOWN_CLOSE_EASE = [0.4, 0, 1, 1] as const;

const dropdownVariants = {
    closed: {
        opacity: 0,
        y: -10,
        scale: 0.975,
        clipPath: "inset(0 0 14% 0 round 10px)",
        transition: { duration: 0.16, ease: DROPDOWN_CLOSE_EASE },
    },
    open: {
        opacity: 1,
        y: 0,
        scale: 1,
        clipPath: "inset(0 0 0% 0 round 10px)",
        transition: {
            opacity: { duration: 0.18, ease: DROPDOWN_EASE },
            y: { type: "spring" as const, stiffness: 430, damping: 32, mass: 0.72 },
            scale: { duration: 0.28, ease: DROPDOWN_EASE },
            clipPath: { duration: 0.3, ease: DROPDOWN_EASE },
        },
    },
};

const dropdownContentVariants = {
    closed: {
        opacity: 0,
        y: -4,
        transition: { duration: 0.1, ease: DROPDOWN_CLOSE_EASE },
    },
    open: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.2, delay: 0.045, ease: DROPDOWN_EASE },
    },
};

function countryCodeToFlag(country: CountryCode) {
    return country.replace(/./g, (letter) =>
        String.fromCodePoint(FLAG_OFFSET + letter.charCodeAt(0))
    );
}

export function CountryCodeSelect({
    locale,
    label,
    searchPlaceholder,
    noResultsLabel,
}: CountryCodeSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState("");
    const [selectedCountry, setSelectedCountry] = useState<CountryCode>("PL");
    const reduceMotion = useReducedMotion();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const triggerRef = useRef<HTMLButtonElement>(null);
    const searchRef = useRef<HTMLInputElement>(null);

    const countries = useMemo<CountryOption[]>(() => {
        const displayNames = new Intl.DisplayNames([locale], { type: "region" });

        return getCountries()
            .map((country) => ({
                country,
                name: displayNames.of(country) ?? country,
                callingCode: getCountryCallingCode(country),
            }))
            .sort((first, second) => first.name.localeCompare(second.name, locale));
    }, [locale]);

    const filteredCountries = useMemo(() => {
        const normalizedQuery = normalizeSearch(query.trim());
        if (!normalizedQuery) return countries;

        const digits = normalizedQuery.replace(/\D/g, "");

        return countries.filter(({ country, name, callingCode }) => {
            const matchesText = normalizeSearch(`${name} ${country}`).includes(normalizedQuery);
            const matchesCode = digits.length > 0 && callingCode.startsWith(digits);
            return matchesText || matchesCode;
        });
    }, [countries, query]);

    const selectedCallingCode = getCountryCallingCode(selectedCountry);

    useEffect(() => {
        function handleOutsideClick(event: PointerEvent) {
            if (!wrapperRef.current?.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }

        document.addEventListener("pointerdown", handleOutsideClick);
        return () => document.removeEventListener("pointerdown", handleOutsideClick);
    }, []);

    useEffect(() => {
        if (isOpen) searchRef.current?.focus();
    }, [isOpen]);

    function closeAndRestoreFocus() {
        setIsOpen(false);
        triggerRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
        if (event.key === "Escape" && isOpen) {
            event.preventDefault();
            closeAndRestoreFocus();
        }
    }

    function selectCountry(country: CountryCode) {
        setSelectedCountry(country);
        closeAndRestoreFocus();
    }

    return (
        <div ref={wrapperRef} className={styles.countrySelect} onKeyDown={handleKeyDown}>
            <input type="hidden" name="countryCode" value={`+${selectedCallingCode}`} />
            <button
                ref={triggerRef}
                className={styles.countryTrigger}
                type="button"
                role="combobox"
                aria-label={label}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                aria-controls="country-code-options"
                onClick={() => setIsOpen((open) => !open)}
            >
                <span className={styles.selectedCountry}>
                    <span className={styles.countryFlag} aria-hidden="true">
                        {countryCodeToFlag(selectedCountry)}
                    </span>
                    <span>+{selectedCallingCode}</span>
                </span>
                <span className={styles.countryChevron} aria-hidden="true" />
            </button>

            <AnimatePresence initial={false} onExitComplete={() => setQuery("")}>
                {isOpen && (
                    <m.div
                        className={styles.countryDropdown}
                        variants={reduceMotion ? undefined : dropdownVariants}
                        initial={reduceMotion ? false : "closed"}
                        animate={reduceMotion ? undefined : "open"}
                        exit={reduceMotion ? undefined : "closed"}
                    >
                        <m.div
                            variants={reduceMotion ? undefined : dropdownContentVariants}
                            initial={reduceMotion ? false : "closed"}
                            animate={reduceMotion ? undefined : "open"}
                            exit={reduceMotion ? undefined : "closed"}
                        >
                            <input
                                ref={searchRef}
                                className={styles.countrySearch}
                                type="search"
                                value={query}
                                onChange={(event) => setQuery(event.target.value)}
                                placeholder={searchPlaceholder}
                                aria-label={searchPlaceholder}
                                autoComplete="off"
                            />

                            <ul
                                id="country-code-options"
                                className={styles.countryOptions}
                                role="listbox"
                            >
                                {filteredCountries.map(({ country, name, callingCode }) => (
                                    <li
                                        key={country}
                                        role="option"
                                        aria-selected={country === selectedCountry}
                                    >
                                        <button
                                            type="button"
                                            onClick={() => selectCountry(country)}
                                        >
                                            <span className={styles.countryIdentity}>
                                                <span
                                                    className={styles.countryFlag}
                                                    aria-hidden="true"
                                                >
                                                    {countryCodeToFlag(country)}
                                                </span>
                                                <span className={styles.countryName}>{name}</span>
                                            </span>
                                            <span className={styles.callingCode}>
                                                +{callingCode}
                                            </span>
                                        </button>
                                    </li>
                                ))}

                                {filteredCountries.length === 0 && (
                                    <li className={styles.noCountries}>{noResultsLabel}</li>
                                )}
                            </ul>
                        </m.div>
                    </m.div>
                )}
            </AnimatePresence>
        </div>
    );
}
