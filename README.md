# UI Intelligence

[简体中文](README_CN.md)

`ui-intelligence` helps coding agents choose UI components that fit an existing project. It starts with local components and design tokens, then uses compatible registries to fill gaps. It can recommend a design direction, compare candidates, or integrate and verify a selected component.

## Install

The installer requires Node.js 22.20 or later, npm, and Git. It runs on Windows, macOS, and Linux and uses Vercel Skills to handle agent-specific Skill locations. [Supported agents](https://github.com/vercel-labs/skills#supported-agents)

Install the package from npm and then launch its installer. In an interactive terminal, use the arrow keys to move, Space to toggle an agent, and Enter to confirm. Locally detected agents are preselected.

```sh
npm install -g ui-intelligence-skill
ui-intelligence-skill
```

You can also install the versioned tarball from GitHub Releases. The URL install opts in to remote tarballs for this command on npm 12.

```sh
npm install -g --allow-remote=root https://github.com/yanhuo218/My-ui-skill/releases/download/v0.1.0/ui-intelligence-skill-0.1.0.tgz
ui-intelligence-skill
```

To run the installer from a source checkout, use these commands from the repository root.

```sh
npm ci
npm run install:skill
```

Pass `--agent` more than once to select specific agents without opening the menu. Use `--yes` to select detected agents automatically, which is also the default in a non-interactive terminal. Common IDs include `codex`, `claude-code`, `cursor`, `github-copilot`, `gemini-cli`, `opencode`, `windsurf`, `cline`, and `antigravity`.

```sh
ui-intelligence-skill --agent codex --agent claude-code --agent cursor
```

Clients that use the shared Skill directory can also install directly with Vercel Skills. Use the repository installer to populate GitHub Copilot's native user directory. [VS Code Skill locations](https://code.visualstudio.com/docs/agent-customization/agent-skills#skill-locations)

```sh
npx -y skills@1.9.0 add . --skill ui-intelligence --global --yes
```

### What the installer adds

The plan identifies pending Skills and MCP entries for each selected agent. The installer installs Skills and the CLI first, registers MCP servers that require no credentials next, and registers 21st MCP last. Existing entries are reused, and the bundled Skill is updated when its files differ.

- **Skills** include UI/UX Pro Max and four official 21st Skills, `21st-cli-use`, `21st-ui-build`, `21st-ui-explore`, and `21st-ui-review`. The installer reuses dependencies already available to each selected agent. [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) · [21st official Skills](https://github.com/21st-dev/skill)
- **21st CLI** is installed globally through npm when the `21st` command is missing from PATH.
- **MCP servers** include the local `ui-hub` aggregator, shadcn, Magic UI, frontend-inspo, and 21st. Automatic user-level configuration is available for Codex, Claude Code, Cursor, GitHub Copilot in VS Code, Gemini CLI, and OpenCode. Existing entries take precedence, and other clients receive setup instructions. The previous `--with-mcp` flag is still accepted.

### Manual setup

The installer prints the remaining setup steps at the end. Supply credentials after installation.

- For a newly registered 21st MCP server, set `API_KEY_21ST` in the agent's environment. If the client already has 21st configured, use its existing authentication method. [21st setup](https://21st.dev/mcp)
- To use the 21st CLI, sign in with `21st login` if needed and confirm with `21st whoami`.
- To use Magic UI **through shadcn**, merge the `@magicui` entry into the target app's existing `components.json`. [Registry configuration](skills/ui-intelligence/references/component-sources.md)
- Reopen the agent session and check the MCP connections.

## UI Hub MCP

`ui-hub` runs locally over stdio. The installer registers it with the Node executable and the absolute server path. For manual registration, use `node` with the absolute path to `mcp/server.mjs` as its argument after running `npm ci`. Keep the repository at that path so the client can start it.

| Tool | Inputs | Output |
| --- | --- | --- |
| `search_components` | `query`, optional `context` and `limit` | Ranked, deduplicated candidates and per-source status |
| `get_component` | `source`, `id`, optional `directory` | Source files, dependencies, and license evidence |
| `evaluate_component` | `source`, `id`, `project` | Compatibility, dependency ranges, score, blockers, and items to verify |
| `prepare_install` | `source`, `id`, `project` | Prerequisites, declared file targets, and command arguments for the agent to review |

Pass the absolute target app directory as `context.directory`, `directory`, or `project.directory` as appropriate. Use the `source` and `id` from search results. The default sources are shadcn, Magic UI, 21st, and shadcn-compatible registries configured in the project. 21st uses the official CLI session or API key, and requesting source code can use the account's retrieval quota.

The service reads the project and provider data. It returns installation and dry-run commands for the agent to review and execute when in scope. [Tool arguments, scoring, and plan statuses](skills/ui-intelligence/references/component-sources.md#ui-hub-mcp)

## Use

Open a new agent session in the target frontend project. Request a design direction, a component recommendation, or an implementation.

> Use ui-intelligence to recommend a table component for this analytics dashboard. Check the project's existing components and theme, then compare available candidates by source, dependencies, and adaptation effort.

To request implementation, add “Integrate the selected component into the dashboard and run the existing checks.”

The workflow covers project inspection, design direction, discovery, evaluation, source acquisition, integration, and verification. [Full workflow](skills/ui-intelligence/SKILL.md) · [Component sources](skills/ui-intelligence/references/component-sources.md)

## Verification

Run `npm run test:install` after `npm ci` to check the npm package, global CLI, staged installation, repeat installation, and all four MCP tools against a local registry fixture. GitHub Actions runs this check on Linux, Windows, and macOS. [Package installation workflow](https://github.com/yanhuo218/My-ui-skill/actions/workflows/install.yml)
