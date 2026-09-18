import { useEffect, useState } from "react";

export function useActiveSection(ids: readonly string[], enabled = false): string {
    const [active, setActive] = useState<string>("");

    useEffect(() => {
        // Wait until the caller signals layout is stable (e.g. preloader done)
        if (!enabled) return;

        const compute = () => {
            const scrollY = window.scrollY;
            const viewportH = window.innerHeight;
            const docH = document.documentElement.scrollHeight;

            // At the very top of the landing page, no section should be active
            // yet because the hero is still the primary viewport content.
            if (!window.location.hash && scrollY <= 4) {
                setActive("");
                return;
            }

            // At the bottom of the page — last section is always active.
            // Guard scrollY > 0 so this never fires on fresh page load.
            if (scrollY > 0 && scrollY + viewportH >= docH - 50) {
                const last = ids[ids.length - 1];
                if (last) setActive(last);
                return;
            }

            // Find the last section whose top has crossed 35% of the viewport
            const threshold = scrollY + viewportH * 0.35;
            let best: string = "";

            for (const id of ids) {
                const el = document.getElementById(id);
                if (!el) continue;
                const top = el.getBoundingClientRect().top + scrollY;
                if (top <= threshold) best = id;
            }

            setActive(best);
        };

        // Defer the initial check one frame so any browser scroll restoration
        // or layout shifts have settled before we read scroll position.
        const raf = requestAnimationFrame(compute);
        window.addEventListener("scroll", compute, { passive: true });
        window.addEventListener("resize", compute, { passive: true });
        window.addEventListener("pageshow", compute);
        return () => {
            cancelAnimationFrame(raf);
            window.removeEventListener("scroll", compute);
            window.removeEventListener("resize", compute);
            window.removeEventListener("pageshow", compute);
        };
    }, [enabled, ids]);

    return active;
}
