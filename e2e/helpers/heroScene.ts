import type { Page } from "@playwright/test";

export async function sampleHeroScene(page: Page) {
    return page.evaluate(async () => {
        const root = document.getElementById("hero-transition-track")!;
        const stage = document.getElementById("hero-sticky-stage")!;
        const height = stage.getBoundingClientRect().height;
        const top = root.getBoundingClientRect().top + scrollY;
        const endOf = (id: string) =>
            top + document.getElementById(id)!.getBoundingClientRect().height - height;
        const heroEnd = endOf("hero-scroll-track");
        const start = top + (heroEnd - top) * 0.9;
        const end = endOf("stats-camera-track");
        const selectedEnd = endOf("selected-motion-track");
        const points = [
            top,
            top + (heroEnd - top) * 0.5,
            start,
            ...[0.04, 0.1, 0.3, 0.52, 0.535, 0.55, 0.57, 0.62, 0.82, 1].map(
                (p) => start + (end - start) * p
            ),
            ...[0.25, 0.65, 1].map((p) => end + (selectedEnd - end) * p),
        ];
        const elements = {
            grid: document.querySelector<HTMLElement>("#stats [class*='grid']")!,
            firstStat: document.querySelector<HTMLElement>(
                "#stats [class*='stat']:not([class*='stats'])"
            )!,
            title: document.querySelector<HTMLElement>("h1 [class*='nameLine']")!,
            selected: document.querySelector<HTMLElement>("[class*='selectedMotionLayer']")!,
        };
        const poses = [];
        for (const y of [...points, ...points.slice().reverse()]) {
            scrollTo(0, Math.round(y));
            for (let i = 0; i < 4; i++) await new Promise(requestAnimationFrame);
            const bounds = Object.fromEntries(
                Object.entries(elements).map(([name, element]) => {
                    const rect = element.getBoundingClientRect();
                    return [name, [rect.x, rect.y, rect.width, rect.height]];
                })
            );
            poses.push({ y: scrollY, bounds });
        }
        return poses;
    });
}
