// One entry in the admin-managed tool-badge catalog
// (@avrash/content-data's tool-badges.json) - the pool of tools a project
// can be tagged with (Project.tools), shown as small badges in the
// project modal. Not to be confused with `Tool` (tool.ts), which is the
// home page's ToolsSection cards - a different entity entirely.
export interface ToolBadgeOption {
    key: string;
    label: string;
}
