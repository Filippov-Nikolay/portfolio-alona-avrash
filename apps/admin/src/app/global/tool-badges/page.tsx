import { listOptions } from "@/entities/optionList/api/optionListRepository";
import { addToolBadgeAction, removeToolBadgeAction } from "@/entities/toolBadge/api/actions";
import { PageHeader } from "@/shared/ui/PageHeader";
import { OptionListManager } from "@/widgets/OptionListManager";
import styles from "./page.module.css";

export default async function GlobalToolBadgesPage() {
    const options = await listOptions("tool-badges.json");

    return (
        <div>
            <PageHeader title="Tool badges" />
            <p className={styles.hint}>
                The small tool icons shown in a project&apos;s modal - not the same as Home &gt;
                Tools.
            </p>
            <OptionListManager
                options={options}
                itemNoun="tool"
                addAction={addToolBadgeAction}
                removeAction={removeToolBadgeAction}
            />
        </div>
    );
}
