import { getCvRepository } from "@/entities/cv/api/cvRepository";
import { requireAdminSession } from "@/shared/auth/requireAdminSession";
import { PageHeader } from "@/shared/ui/PageHeader";
import { CvManager } from "@/widgets/CvManager/CvManager";

export default async function GlobalCvPage() {
    await requireAdminSession();
    const content = await getCvRepository().get();
    return (
        <div>
            <PageHeader
                title="CV"
                description="Manage the PDF visitors download in each website language."
            />
            <CvManager initialContent={content} />
        </div>
    );
}
