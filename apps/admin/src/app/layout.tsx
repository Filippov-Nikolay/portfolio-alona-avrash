import type { Metadata } from "next";
import { AdminNav } from "@/widgets/AdminNav";
import "./globals.css";

export const metadata: Metadata = {
    title: "Alona Avrash - Admin",
    robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                <AdminNav />
                <main>{children}</main>
            </body>
        </html>
    );
}
