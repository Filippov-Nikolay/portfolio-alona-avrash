# @avrash/ui

React components used by both [`apps/web`](../../apps/web/README.md) and
[`apps/admin`](../../apps/admin/README.md). Admin's project preview renders the same components as
the site, so the preview always matches the site.

| Export                                                        | What it is                                                                                                                      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `WorksCard`                                                   | Project card in the works catalog                                                                                               |
| `ShowcaseModal`                                               | Project modal (works, home projects, Selected Work) with overview and gallery tabs; shows GIF posters until the animation loads |
| `ToolBadge`, `TOOL_BADGES`, `getToolBadge`                    | Tool badges shown on project cards and in the modal                                                                             |
| `Button`                                                      | Shared button with variants and sizes                                                                                           |
| `ACCENT_COLORS`, `ArrowIcon`, `CloseIcon`, `cn`, `useMounted` | Shared constants, icons and helpers                                                                                             |
| `@avrash/ui/styles/*`                                         | `tokens.scss`, `typography.scss`, `mixins.scss`                                                                                 |

The package ships TypeScript source. Each app compiles it through `transpilePackages`, so there is no
separate build step. `next`, `react`, `react-dom` and `framer-motion` are peer dependencies, so both
apps use one copy of each.

```bash
pnpm --filter @avrash/ui run type-check
```
