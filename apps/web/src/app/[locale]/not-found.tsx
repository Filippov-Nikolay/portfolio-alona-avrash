import type { Metadata } from "next";
import { NotFoundSection } from "@/widgets/NotFoundSection";

export const metadata: Metadata = {
    title: "404",
    robots: { index: false, follow: false },
};

export default function NotFoundPage() {
    return (
        <main>
            <NotFoundSection />
        </main>
    );
}
