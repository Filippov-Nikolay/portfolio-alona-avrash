import { Tag } from "@/shared/ui/Tag";
import { cn } from "@/shared/lib/cn";
import styles from "./TagList.module.scss";

type TagVariant = "default" | "purple" | "orange";

interface TagListProps {
    tags: readonly string[];
    limit?: number;
    variant?: TagVariant;
    tagClassName?: string;
    className?: string;
}

export function TagList({ tags, limit, variant, tagClassName, className }: TagListProps) {
    const items = limit !== undefined ? tags.slice(0, limit) : tags;
    return (
        <div className={cn(styles.tagList, className)}>
            {items.map((tag) => (
                <Tag key={tag} variant={variant} className={tagClassName}>
                    {tag}
                </Tag>
            ))}
        </div>
    );
}
