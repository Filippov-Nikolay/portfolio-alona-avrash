import { useEffect, useState } from "react";

const HERO_INTRO_COMPLETE = "avrash:hero-intro-complete";

let heroIntroComplete = false;

export function markHeroIntroComplete(): void {
    if (heroIntroComplete) return;
    heroIntroComplete = true;
    window.dispatchEvent(new Event(HERO_INTRO_COMPLETE));
}

export function useHeroIntroComplete(waitForHero: boolean, fallbackMs: number): boolean {
    const [complete, setComplete] = useState(heroIntroComplete);

    useEffect(() => {
        if (!waitForHero || heroIntroComplete) return;
        const finish = () => setComplete(true);
        const fallback = window.setTimeout(finish, fallbackMs);
        window.addEventListener(HERO_INTRO_COMPLETE, finish, { once: true });
        return () => {
            window.clearTimeout(fallback);
            window.removeEventListener(HERO_INTRO_COMPLETE, finish);
        };
    }, [waitForHero, fallbackMs]);

    return !waitForHero || complete || heroIntroComplete;
}
