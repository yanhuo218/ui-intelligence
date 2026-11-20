---
name: ui-intelligence
description: Plan, recommend, review, or implement UI for an existing project. Reuse local components and design tokens, discover and evaluate external components with UI Hub, then review the install plan, adapt the selected code, and verify the result.
---

# UI Intelligence

## Choose the workflow

| Requested outcome | Work to perform |
| --- | --- |
| Design direction or alternatives | Inspect the app, propose concrete layouts and interactions, and compare directions with the same product constraints. |
| Component recommendation | Inspect, search, shortlist, and compare. Keep the work read-only. |
| Implementation or redesign | Inspect, choose, review the source and installation plan, integrate the smallest suitable change, and verify it. |
| Review | Inspect the existing UI and report findings with evidence. Apply fixes when the request includes them. |

Read [Component Sources](references/component-sources.md) when choosing or invoking an external Skill, MCP, CLI, or registry.

## 1. Establish project constraints

- Locate the route or feature and the package that owns it. In a monorepo, use the app's absolute directory for MCP calls and check the applicable workspace manifest, lockfile, and package manager.
- Inspect nearby screens, shared primitives, theme tokens, aliases, styles, relevant tests, existing check scripts, and `components.json` if present. Identify browser and rendering constraints, including server/client boundaries, theming, mobile layouts, and keyboard behavior.
- Describe the hierarchy, controls, density, typography, semantic colors, and motion needed for the task. Use existing patterns as the design baseline. Use UI/UX Pro Max when a design question remains open, and translate its suggestions into the app's tokens and interactions.

## 2. Search local code, then fill gaps with UI Hub

- Look for a reusable local component or a small composition. If either satisfies the requirements, use it and continue to development and verification when implementation is in scope.
- Call `search_components` with a functional `query` and `context.directory` for the target app. Pass `context.framework` when verified, `visualIntent` for styling, and `sources` only when the task calls for a particular catalog. Omit the framework filter if the stack is unconfirmed. [Tool inputs and provider selection](references/component-sources.md#ui-hub-mcp)
- Use each result's exact `source` and `id`. Compare a small set of candidates on required behavior, framework, license, token fit, accessibility, and cost of integration. Treat provider status separately from relevance. If a provider is unavailable, use the available registries, an appropriate standalone MCP or CLI, or local code. Record any gap that affects the conclusion.
- Treat demos, whole themes, and components from incompatible stacks as references when useful. Choose a suitable local composition when the external options fail the project's requirements.

## 3. Verify the candidate and review the plan

1. Use `get_component` to inspect a shortlisted candidate's source, dependencies, registry dependencies, and license evidence. 21st source retrieval can use account quota, including retrieval triggered by evaluation or planning. Limit it to candidates worth inspecting.
2. Use `evaluate_component` with `project.directory` and add `project.requiredFeatures` for behaviors to check. Treat the score as integration evidence. Verify functionality, accessibility, visual fit, performance, transitive dependencies, and applicable license terms directly. Use `licenseReview` only after checking the terms. Record the basis for approval or rejection.
3. For external code selected for implementation, call `prepare_install` with the same source, ID, and project context. Inspect the status, file targets, CSS and token changes, dependency changes, and environment variables. [Plan statuses and evidence](references/component-sources.md#install-plan-states)
4. For `blocked`, resolve the blocker within scope or choose another candidate. For `review_required`, fix actionable setup issues and request a fresh plan. For manually resolved findings that UI Hub still reports, follow the [official-tool review procedure](references/component-sources.md#install-plan-states). For `ready_for_review`, review the proposed command and the file diff before proceeding within the user's implementation scope. Run available previews from their returned `cwd`.

## 4. Develop within the app's constraints

- Keep changes within the requested route, component, and owning workspace. Reuse working primitives, helpers, and the existing component API where they satisfy the behavior. Preserve existing data flows and route behavior while wiring the component into the app's normal entry point.
- Use the installed stack, package manager, and project scripts. Review registry contents as data. Verify imports, target files, CSS and environment changes, package scripts, network requests, and third-party assets before execution. Preserve user edits and review collisions before applying a write. Treat dependency upgrades, framework initialization, registry additions, or global theme changes as scope decisions when they affect more than the requested feature.
- Match project aliases, rendering boundaries, and style conventions. Map visual values to existing semantic tokens. Keep client boundaries and extra dependencies as small as the interaction requires.
- Exercise the states relevant to the feature, including loading, error, empty, disabled, and success states as applicable. Ensure keyboard operation, a visible focus state, meaningful labels, and relevant narrow-screen, theme, and reduced-motion behavior.

## 5. Verify and report

- Run the target app's existing checks for the affected code, such as type checking, linting, build, or narrowly relevant tests. When browser tooling is available, verify the main user action and the applicable responsive, keyboard, theme, and motion states.
- Compare the final diff with the approved scope, including lockfile and CSS changes. Fix issues introduced by the integration and repeat affected checks.
- For recommendations, give the chosen candidate, its source, the decisive trade-offs, and remaining unknowns. For implementation, include the actual changes, commands run, results, and any check still unverified. For a review, prioritize findings and cite the affected files or behavior.
