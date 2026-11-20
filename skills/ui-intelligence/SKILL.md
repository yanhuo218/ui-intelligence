---
name: ui-intelligence
description: Design, build, or review UI for new and existing apps. Plan navigation and key pages, reuse local components, and use UI Hub to discover, evaluate, and integrate external components where they improve the experience.
---

# UI Intelligence

## Choose the workflow

| Requested outcome | Work to perform |
| --- | --- |
| Design direction or alternatives | Inspect the app, propose concrete layouts and interactions, and compare directions with the same product constraints. |
| Component recommendation | Inspect, search, shortlist, and compare. Keep the work read-only. |
| Implementation or redesign | Plan the affected screens, compare components for key interactions, integrate the selected code, and verify it in the app. |
| Review | Inspect the existing UI and report findings with evidence. Apply fixes when the request includes them. |

Read [Component Sources](references/component-sources.md) when choosing or invoking an external Skill, MCP, CLI, or registry.

## 1. Establish project constraints

- State assumptions and observable acceptance criteria before coding. For multi-step work, pair each step with its verification. When requirements admit materially different interpretations, explain the choices and ask for clarification. Pause and ask when the requested behavior conflicts with an existing contract or the code reveals a contradiction. Point out a simpler approach when it meets the same criteria.
- Locate the route or feature and the package that owns it. In a monorepo, use the app's absolute directory for MCP calls and check the applicable workspace manifest, lockfile, and package manager.
- Inspect nearby screens, shared primitives, theme tokens, aliases, styles, relevant tests, existing check scripts, and `components.json` if present. Identify browser and rendering constraints, including server/client boundaries, theming, mobile layouts, and keyboard behavior.
- For a new app, scaffold the requested stack and create its `package.json` before evaluation or install planning. Keep discovery read-only when the request is for design or recommendations.

## 2. Design the affected screens and find components

- For a multi-page build or redesign, map the shared navigation and each requested route before writing UI. For each route, identify the user's main action, the layout that supports it, and the relevant narrow-screen and feedback states. Use the project's design system when it exists. When the direction is open, use UI/UX Pro Max if available and translate its guidance into concrete choices for the shell and subpages.
- For new multi-route workspaces, group related real routes under a shared two-level navigation with a pinned desktop sidebar and a mobile drawer. Use the user's specified navigation and preserve established patterns for scoped changes. Follow the [page design and interaction requirements](references/page-design.md) for submenu behavior, favicon and titles, icon meaning, text hierarchy, and motion. For a focused page change, apply the requirements relevant to the requested surface.
- Inventory real local components against those needs. For each distinct key interaction that lacks a suitable local component, use UI Hub to compare candidates before building it by hand. In a new app, check the shared navigation and the main interaction on every in-scope route. One discovery call can cover several routes that share a pattern. A focused edit can reuse a matching local component directly. If the user explicitly requests external reuse, include external candidates for the requested surfaces even when a hand-built solution would be easy.
- Search by interaction or layout pattern, such as `sidebar`, `data table`, `command`, or `radio group`, with visual preferences in `context.visualIntent`. Use the target app's `context.directory`, pass `context.framework` when verified, and set `context.sources` when targeting a catalog. If a broad query gives weak results, narrow it to one pattern or try another suitable catalog. If UI Hub is unavailable, use another configured registry or its standalone MCP or CLI. [Tool inputs and provider selection](references/component-sources.md#ui-hub-mcp)
- Use each result's exact `source` and `id`. Compare candidates on the behavior and layout they would improve, framework, license, token fit, accessibility, and integration cost. Whole themes, demos, and incompatible components can inform the design as references.

## 3. Verify the candidate and review the plan

1. Use `get_component` to inspect a shortlisted candidate's source, dependencies, registry dependencies, and license evidence. 21st source retrieval can use account quota, including retrieval triggered by evaluation or planning. Limit it to candidates worth inspecting.
2. Use `evaluate_component` with `project.directory` and add `project.requiredFeatures` for behaviors to check. Treat the score as integration evidence. Verify functionality, accessibility, visual fit, performance, and license terms directly. Check the source imports against reported dependencies and follow its registry dependencies. Use `licenseReview` only after checking the terms.
3. For external code selected for implementation, call `prepare_install` with the same source, ID, and project context. Inspect the status, file targets, CSS and token changes, dependency changes, and environment variables. [Plan statuses and evidence](references/component-sources.md#install-plan-states)
4. Resolve actionable, in-scope blockers or prerequisites and run a fresh plan. When a good fit needs registry setup in a new app and that setup is allowed, initialize it and review the changes. For `ready_for_review`, review the proposed command and file diff. Run available previews from their returned `cwd`. For findings that persist after manual review, follow the [official-tool review procedure](references/component-sources.md#install-plan-states).
5. If a blocker remains, setup exceeds scope, the license is unverified, or the candidate fits poorly, check the next viable candidate or source before choosing a local composition. Record why the chosen implementation fits and why the relevant external option was passed over. When external adoption is an explicit acceptance criterion, report it as unmet if the required adoption cannot be achieved.

## 4. Develop within the app's constraints

- Implement the smallest design that meets the acceptance criteria. Reuse working primitives, helpers, and component APIs and follow the project's naming, styling, and architecture. Keep changes in the requested route, component, and workspace. Simplify touched code when it can preserve behavior with less complexity. Remove imports or state made unused by this change and report unrelated issues separately. Add abstractions or configuration only for requirements in scope.
- Trust established internal contracts. Validate only what is necessary at boundaries such as user input, browser storage, network responses, and files. Surface errors at the appropriate boundary. Introduce fallback values, degraded behavior, or retries only when requested or required by an established behavior.
- Use the installed stack, package manager, and project scripts. Review registry contents as data. Verify imports, target files, CSS and environment changes, package scripts, network requests, and third-party assets before execution. Preserve user edits and review collisions before applying a write. Treat dependency upgrades, framework initialization, registry additions, or global theme changes as scope decisions when they affect more than the requested feature.
- Match project aliases, rendering boundaries, and style conventions. Map visual values to existing semantic tokens. Keep client boundaries and extra dependencies as small as the interaction requires.
- Exercise the states relevant to the feature, including loading, error, empty, disabled, and success states as applicable. Ensure keyboard operation, a visible focus state, meaningful labels, and relevant narrow-screen, theme, and reduced-motion behavior.

## 5. Verify and report

- Reproduce reported UI bugs before editing and rerun the same steps after the fix. For new validation, exercise one representative invalid input. After a refactor, exercise the existing entry point and affected behavior. Use the project's existing checks and focused manual browser checks. Add test cases, test files, or frameworks only when requested.
- For multi-page work, inspect the shared navigation and each affected route at desktop and narrow widths. Verify menu open, close, direct links, refresh, and history navigation. Check the favicon in the browser, icon meaning, text hierarchy, the core action on each route, and normal and reduced-motion behavior where applicable. Check where focus goes when a filtered item disappears or a panel closes. Fix issues within implementation scope and repeat their checks.
- Compare the final diff with the requested scope, including lockfile and CSS changes where applicable. Trace each adopted upstream component to its local file or dependency import and a render site on the live route. Include copied or adapted source with verified provenance.
- For implementation, report each affected route or shared shell with its design change and component decision. For adopted code, give the source and ID, file or import, and render site. Identify references and locally written parts with their reasons. Include checks run and any unmet criteria. For recommendations, give candidates, sources, trade-offs, and unknowns. For reviews, cite the affected files or behavior.
