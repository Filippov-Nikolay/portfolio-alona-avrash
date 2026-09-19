import { listOptions } from "@/entities/optionList/api/optionListRepository";
import { addCategoryAction, removeCategoryAction } from "@/entities/category/api/actions";
import { PageHeader } from "@/shared/ui/PageHeader";
import { OptionListManager } from "@/widgets/OptionListManager";

export default async function GlobalCategoriesPage() {
    const options = await listOptions("categories.json");

    return (
        <div>
            <PageHeader title="Categories" />
            <OptionListManager
                options={options}
                itemNoun="category"
                addAction={addCategoryAction}
                removeAction={removeCategoryAction}
            />
        </div>
    );
}
