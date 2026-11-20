# Component Sources

Choose sources based on the project's framework, the desired behavior, and the tools available in the current client.

| Source | When to use it | Evidence to capture |
| --- | --- | --- |
| Project components and patterns | Start here for every UI task. Search the target app and its shared UI packages. | File path, established API, and the features the existing code already covers |
| UI/UX Pro Max | Use for design direction, especially when the project lacks established patterns. Use its Skill or follow its `scripts/search.py` instructions. | The design choices you can apply to the target screen and the tokens they map to |
| shadcn MCP | Search the project's shadcn-compatible registries and inspect relevant item definitions. | Registry name, item ID, source files, package and registry dependencies, and the proposed install command |
| 21st MCP or `21st-cli-use` | Search for React/shadcn components, themes, or templates when the project needs more options. Fetch source for a selected candidate when credentials and quota allow it. | Original item URL or author/slug, code retrieval method, and upstream license terms |
| Magic UI | Look for focused motion or visual effects. Use the `@magicui` registry through shadcn when configured, or query the standalone MCP. | Component ID, dependency and DOM cost, and reduced-motion behavior |
| frontend-inspo | Use when primary sources provide limited coverage or when comparing visual references across libraries. Follow results to the original provider. | Original URL and confirmation of framework, source availability, and reuse terms |

For Vue, Svelte, native mobile, and other non-React stacks, use component sources that match the project. React examples can inform layout and interaction ideas.

## UI Hub MCP

- Search with `{query: "card", context: {directory: "/absolute/path/to/app", framework: "react", sources: ["@shadcn", "@magicui"]}, limit: 6}`. The optional `visualIntent` field adjusts ranking. Source failures appear alongside results from other providers.
- Pass the returned `source` and `id` to `get_component` along with the app directory when needed for project registries. 21st IDs are numeric strings. Registry IDs are qualified names such as `@shadcn/card`.
- Pass `project: {directory: "/absolute/path/to/app"}` to `evaluate_component` and `prepare_install`. When framework detection is ambiguous, add `project.framework`. Pass `requiredFeatures` to track behaviors for manual verification. Use `licenseReview: {status: "approved", evidence: "..."}` after confirming permission from the upstream terms for a component with uncertain licensing.
- The evaluation allocates 35 points to framework compatibility, 20 to license evidence, 20 to source availability, and up to 25 to package reuse. Incompatible frameworks, rejected licenses, declared version conflicts, and unsafe file paths block the plan. Accessibility, performance, and visual fit still require direct verification.
- A plan can be `ready_for_review`, `review_required`, or `blocked`. Review package ranges, transitive registry dependencies, file collisions, and the CLI preview before execution. The service returns command arguments and the working directory for the agent to use.

## shadcn-compatible projects

Start from the target app's directory so shadcn can read its `components.json` and aliases. In the MCP client, inspect the available tools and use the project's configured registries. The CLI commands below show search and retrieval with the verified version. Use the project's pinned CLI version when it has one.

```sh
npx -y shadcn@4.23.0 search "@shadcn" -q card
npx -y shadcn@4.23.0 view "@shadcn/card"
```

For an implementation in an initialized shadcn project, preview changes before running the install.

```sh
npx -y shadcn@4.23.0 add "@shadcn/card" --dry-run
```

If the project needs Magic UI through shadcn, merge the following entry into its existing `components.json` under `registries`. Use the project's existing mapping if it already defines `@magicui`.

```json
{
  "registries": {
    "@magicui": "https://magicui.design/r/{name}.json"
  }
}
```

After configuring the registry, `npx -y shadcn@4.23.0 view "@magicui/marquee"` can retrieve an example item.

## 21st

Use the MCP tool for search and retrieval when it is available and authenticated. With the CLI, search by functional need and keep the returned item ID or author/slug, as appropriate for the next command.

```sh
21st search "sortable data table" --type c --limit 5
21st get "<item-id>"
```

Code retrieval may depend on account access or quota. If retrieval fails, use the candidate's public source or choose another source. Before integrating, verify the actual source, its reuse terms, and any required dependencies.

## Documentation

- [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill)
- [shadcn MCP](https://ui.shadcn.com/docs/mcp) · [shadcn CLI](https://ui.shadcn.com/docs/cli)
- [21st MCP and CLI](https://21st.dev/mcp) · [21st official Skills](https://github.com/21st-dev/skill)
- [Magic UI MCP and Registry](https://magicui.design/docs/mcp)
- [frontend-inspo](https://github.com/notsointresting/frontend-inspo-mcp)
