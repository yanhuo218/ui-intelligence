# Component Sources

## Tool selection

| Skill or tool | Use it for | Requirements and checks |
| --- | --- | --- |
| Local files and checks | Finding existing components, tokens, patterns, and feature constraints | Use the owning workspace. Keep requests for design, recommendation, or review read-only unless the user includes edits. |
| `ui-ux-pro-max` | Choosing hierarchy, visual direction, typography, density, and motion | Use if installed. Its search scripts require Python 3. Apply the app's existing tokens and constraints to the recommendations. |
| `ui-hub` | Cross-registry discovery, source inspection, evaluation, and install plans | Local stdio MCP. Supply the app's absolute directory. Registry access can require the network and provider credentials. |
| shadcn MCP or CLI | Searching configured shadcn-compatible registries, inspecting items, and previewing their installation | Use the app's registry configuration, aliases, and pinned CLI when available. Check for private registry credentials and component initialization where applicable. |
| Magic UI MCP | Looking up a specific animation or effect | Check framework, reduced motion, rendering cost, and compatibility with the app's design. When using Magic UI through shadcn, use a configured `@magicui` registry for installation. |
| frontend-inspo MCP | Finding references when the primary sources have limited coverage | Verify the original source, install method, framework, and reuse terms. |
| 21st MCP or `21st-cli-use` | Searching 21st and retrieving source for a selected component | Use a working client credential or CLI session. Keep search IDs and install slugs distinct. Component code retrieval can be metered. |
| `21st-ui-explore` | Comparing distinct UI directions while the direction is still open | Keep the same product and stack constraints across options. Hosted sketches use an authorized provider feature and may consume credits. |
| `21st-ui-build` | Applying 21st-specific build guidance to a selected direction | Use when implementation is in scope. Follow the project checks and UI Hub plan where relevant. |
| `21st-ui-review` | Inspecting an existing page or a targeted change | Use review mode for findings. Enable fixes only when the user requested modifications and review the proposed changes. |

Use framework-matched sources for Vue, Svelte, native mobile, or other non-React apps. React examples may inform layout and interaction. The default UI Hub sources are `@shadcn`, `@magicui`, `21st`, and compatible registries registered by the target app. Standalone Magic UI and frontend-inspo MCPs can be called separately. Use the closest working tool when a local client lacks one of these offerings.

## UI Hub MCP

| Tool | Required arguments | Optional arguments and effect |
| --- | --- | --- |
| `search_components` | `query` | `context.directory` loads app registries. `context.framework` filters known incompatible sources. `context.visualIntent` contributes to ranking. `context.sources` limits the catalogs. `limit` defaults to 8 and accepts 1–20. |
| `get_component` | `source`, `id` | `directory` supplies the app's registry context. Returns source files, dependencies and license information when the provider exposes them. |
| `evaluate_component` | `source`, `id`, `project.directory` | `project.framework` overrides detection. `project.requiredFeatures` tracks behaviors to verify. `project.licenseReview` records confirmed reuse terms. |
| `prepare_install` | `source`, `id`, `project.directory` | Reuse the evaluation options, including any license evidence. Returns the plan, declared targets, and command arguments when the state permits them. |

Example search arguments.

```json
{
  "query": "sortable data table",
  "context": {
    "directory": "/absolute/path/to/app",
    "framework": "react",
    "sources": ["@shadcn", "@magicui"],
    "visualIntent": "compact dashboard layout"
  },
  "limit": 6
}
```

Use the returned qualified registry ID, such as `@shadcn/card`, or the numeric string returned by 21st. A 21st install command also needs a verified author/slug. Search can report `unavailable` for one provider while returning results from others. For custom registries, supply the app directory and use its configured namespace.

UI Hub scores integration fit using 35 points for framework compatibility, 20 for license evidence, 20 for source availability, and up to 25 for package reuse. The score covers the dimensions it measures. Verify features, rendering, accessibility, and cost with source and app evidence. A license review uses `{status: "approved" | "rejected", evidence: "..."}`. Confirm the upstream terms before submitting it.

### Install plan states

| State | Action |
| --- | --- |
| `ready_for_review` | Inspect the exact files and dependencies, verify target path mappings and collisions, and review the preview where available. Execute the returned command only when implementation is in scope. |
| `review_required` | Resolve the reported prerequisites or unknowns, such as missing shadcn configuration, license evidence, or environment variables. Re-run the plan after addressing them. |
| `blocked` | Resolve the blocker within the requested scope or choose another candidate. Blockers include incompatible frameworks, incompatible declared versions, rejected licenses, unsafe declared file paths, and items that change project-wide styling. |

The plan is read-only. Use its `cwd` and arguments when reviewing a command. Confirm the project path and impact of a preview before running it. A source location returned by the plan can require alias resolution before it becomes the final target.

UI Hub reports declared environment variables for manual review and has no option to mark them reviewed. It also gets a 21st install slug from the provider. When only these items remain, confirm the environment variable requirements or verify the author/slug directly with 21st. With the user's implementation scope and the other checks satisfied, use the relevant official CLI and inspect its preview or source diff. Choose another candidate if the remaining requirement cannot be verified.

## shadcn and Magic UI

From an initialized target app, use its pinned shadcn CLI when available. These commands show read-only search, retrieval, and a preview.

```sh
npx -y shadcn@4.23.0 search "@shadcn" -q card
npx -y shadcn@4.23.0 view "@shadcn/card"
npx -y shadcn@4.23.0 add "@shadcn/card" --dry-run
```

When the authorized change includes installing Magic UI through shadcn, merge the following registry entry into the app's existing `components.json`. Reuse an existing `@magicui` mapping.

```json
{
  "registries": {
    "@magicui": "https://magicui.design/r/{name}.json"
  }
}
```

## 21st

UI Hub launches the official CLI package for its 21st provider. Use `21st login` or provide `API_KEY_21ST` in the environment where the Agent starts UI Hub. The separate remote 21st MCP uses the credentials configured for that client.

```sh
21st whoami
21st search "sortable data table" --type c --limit 5
21st get "<item-id>"
```

If the provider reports missing authentication, limited access, or a depleted quota, continue with available sources and report the effect. Before integration, confirm the returned source and its reuse terms.

## Upstream documentation

- [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [shadcn MCP](https://ui.shadcn.com/docs/mcp) · [shadcn CLI](https://ui.shadcn.com/docs/cli)
- [21st MCP](https://21st.dev/mcp) · [21st CLI](https://help.21st.dev/cli) · [21st official Skills](https://github.com/21st-dev/skill)
- [Magic UI MCP and Registry](https://magicui.design/docs/mcp)
- [frontend-inspo MCP](https://github.com/notsointresting/frontend-inspo-mcp)
