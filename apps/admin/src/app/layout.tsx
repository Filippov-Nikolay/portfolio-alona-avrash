import type { Metadata } from "next";
import { getBuildInfo } from "@/shared/config/buildInfo";
import { AdminNav } from "@/widgets/AdminNav";
import "./globals.css";
// Design tokens the preview stage's WorksCard/ShowcaseModal rely on (see
// widgets/PreviewStage) - only activates on [data-theme]/document.body,
// so it doesn't affect the rest of the admin's look.
import "@avrash/ui/styles/tokens.scss";

export const metadata: Metadata = {
    title: "Alona Avrash - Admin",
    robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <AdminNav buildInfo={getBuildInfo()} />
                <main>{children}</main>
            </body>
        </html>
    );
}
