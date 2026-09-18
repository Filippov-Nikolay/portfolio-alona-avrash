import { redirect } from "next/navigation";
import { ADMIN_NAV } from "@/shared/config/nav";

export default function RootPage() {
    const [firstPage] = ADMIN_NAV;
    redirect(`/${firstPage.slug}/${firstPage.sections[0].slug}`);
}
