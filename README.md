# UI Intelligence

[简体中文](README_CN.md) · [Releases](https://github.com/yanhuo218/ui-intelligence/releases)

UI Intelligence gives coding agents a workflow for designing, recommending, reviewing, and integrating UI in new and existing apps. For multi-page work it covers the shared navigation and the main interaction on each route. The bundled UI Hub MCP helps the agent search registries, inspect source, evaluate compatibility, and review installation plans. The agent integrates selected components within the requested scope and verifies where they render.

## What you get

- **UI Intelligence Skill** guides project inspection, design decisions, component selection, integration, and verification.
- **UI Hub MCP** unifies discovery for shadcn, Magic UI, 21st, and shadcn-compatible registries configured by the app.
- **Supporting tools** include UI/UX Pro Max for design guidance, four official 21st Skills and its CLI, and the standalone shadcn, Magic UI, frontend-inspo, and 21st MCP servers. Each provider is used when it fits the task. [Tool roles and requirements](skills/ui-intelligence/references/component-sources.md#tool-selection)

## Requirements and client support

Use Node.js 22.20 or later, npm, and Git on Windows, macOS, or Linux. An internet connection is needed for packages and external catalogs. Python 3 is needed only for the UI/UX Pro Max search scripts.

The installer supports automatic user-level MCP registration for Codex, Claude Code, Cursor, VS Code GitHub Copilot, Gemini CLI, and OpenCode. Add Codex CLI to PATH for its automatic registration. Other supported agents can receive the Skill and use their own MCP setup. [Supported Agent IDs](https://github.com/vercel-labs/skills#supported-agents)

## Manual installation

### 1. Install the CLI

Use the GitHub Release asset. The per-command option allows the explicitly requested remote package on npm 12.

```sh
npm install -g --allow-remote=root https://github.com/yanhuo218/ui-intelligence/releases/download/v0.1.1/ui-intelligence-skill-0.1.1.tgz
```

When the matching version is available on npm, you can install it by name. [npm package status](https://www.npmjs.com/package/ui-intelligence-skill)

```sh
npm install -g ui-intelligence-skill@0.1.1
```

### 2. Select the Agent

```sh
ui-intelligence-skill
```

The installer preselects detected agents. Use the arrow keys to move, Space to toggle, and Enter to confirm. It reports the missing items for each agent, then installs Skills and the CLI, registers MCP servers that require no credentials, and registers 21st MCP. It reuses existing dependency Skills and MCP entries.

For a scripted setup, pass one or more explicit Agent IDs. `--yes` selects all detected agents, as does a non-interactive run with no Agent IDs.

```sh
ui-intelligence-skill --agent codex --agent claude-code
```

From a source checkout, use the repository installer.

```sh
npm ci
npm run install:skill -- --agent claude-code
```

### 3. Finish the configuration

- **UI Hub** uses local stdio. For clients that require manual registration, use `node` as the command and the absolute path to `mcp/server.mjs` as its sole argument. With a global install, this is under the `ui-intelligence-skill` folder returned by `npm root -g`. For a checkout, use the repository path after `npm ci`. Set the path in the client's MCP configuration and keep it available to the client.
- **21st**. For a newly registered remote 21st MCP, set `API_KEY_21ST` in the environment inherited by the Agent. Keep existing working client credentials. For the official CLI and the 21st provider inside UI Hub, use `21st login` or provide the API key in the process environment. Confirm the CLI session with `21st whoami`. Account access and quota govern code retrieval. [21st MCP setup](https://21st.dev/mcp) · [21st CLI authentication](https://help.21st.dev/cli)
- **Magic UI through shadcn**. Merge `"@magicui": "https://magicui.design/r/{name}.json"` into the target app's existing `components.json` under `registries`. Preserve an existing mapping. Public discovery in UI Hub can run before the target app is configured for installation. [Registry configuration](skills/ui-intelligence/references/component-sources.md#shadcn-and-magic-ui)
- Restart the Agent, check that it detects `ui-intelligence`, and run a search-only smoke check from the target app. Inspect the tool call and result.

For a client with an `mcpServers` JSON configuration, merge this entry into the existing file. Replace the example path with the actual absolute path on your machine. VS Code uses `servers` instead. [VS Code MCP configuration](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

```json
{
  "mcpServers": {
    "ui-hub": {
      "command": "node",
      "args": ["/absolute/path/to/ui-intelligence-skill/mcp/server.mjs"]
    }
  }
}
```

For a first connection check, ask the Agent to call `search_components` for `card` with `context.sources` set to `["@shadcn"]`. This works before 21st credentials are configured.

## Let an Agent install it

Paste this prompt into an Agent that can run shell commands. Replace `claude-code` with your client ID if needed.

> Install UI Intelligence v0.1.1 for `claude-code`. Check Node.js, npm, and Git. Run `npm install -g --allow-remote=root https://github.com/yanhuo218/ui-intelligence/releases/download/v0.1.1/ui-intelligence-skill-0.1.1.tgz`, then `ui-intelligence-skill --agent claude-code`. Keep my existing configuration and leave app files untouched during setup. Report which Skills and MCP entries were added or reused and which settings I need to complete. Ask me to configure any credentials outside the chat. Once the client reloads the installation, verify that `ui-intelligence` is discoverable and run a read-only UI Hub search for `card` using only `@shadcn`. Report the actual tool result or the specific blocker.

## Use the Skill

Open a new session in the target app. Identify the requested outcome and any constraints on new dependencies or external providers.

- **Recommend only.** “Use `ui-intelligence` to compare options for a compact, keyboard-sortable table. Start with local components and return candidates, trade-offs, and what still needs checking.”
- **Implement.** “Use `ui-intelligence` to integrate a compact, keyboard-sortable table into the analytics route. Reuse the existing tokens and table behavior, review any external install plan, and run the app's existing checks.”
- **Build a multi-page app.** “Use `ui-intelligence` to build the dashboard, projects, tasks, and settings routes. Plan the navigation and the main interaction on each route. Compare suitable components, verify each adoption at its render site, and review all four routes at desktop and mobile widths.”
- **Review.** “Use `ui-intelligence` to review the analytics table at narrow and wide widths and with keyboard input. Report findings with evidence.”

The [Skill workflow](skills/ui-intelligence/SKILL.md) defines project inspection, source selection, development constraints, and verification. The [page requirements](skills/ui-intelligence/references/page-design.md) cover two-level navigation, favicons and browser titles, icon meaning, text hierarchy, and motion.

## UI Hub MCP reference

| Tool | What it does |
| --- | --- |
| `search_components` | Searches providers and returns ranked candidates and provider availability. |
| `get_component` | Retrieves source files, dependencies, and license evidence for a candidate. |
| `evaluate_component` | Reports framework and dependency fit, blockers, and remaining checks. |
| `prepare_install` | Returns a read-only install plan with prerequisites, file targets, and command arguments where available. |

Use the target app's absolute path and the exact `source` and `id` from search. Review the plan before running any command it returns. [Arguments, scores, and plan states](skills/ui-intelligence/references/component-sources.md#ui-hub-mcp)

## Verification

Run `npm run test:install` after `npm ci` to verify packaging, global CLI installation, Skill and MCP registration, repeat installation, and all four MCP tools against a local Registry fixture. GitHub Actions runs this check on Linux, Windows, and macOS. [Installation workflow](https://github.com/yanhuo218/ui-intelligence/actions/workflows/install.yml)

[MIT license](LICENSE)
