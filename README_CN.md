# UI Intelligence

[English](README.md)

`ui-intelligence` 帮助编程 Agent 选择适合现有项目的 UI 组件。它先检查本地组件和设计 Token，再通过兼容的 Registry 补齐缺口。可以用它推荐设计方向、比较候选组件，也可以集成并验证选中的组件。

## 安装

安装器需要 Node.js 22.20 或更高版本、npm 和 Git，支持 Windows、macOS 和 Linux，并使用 Vercel Skills 处理各 Agent 的 Skill 安装位置。 [支持的 Agent](https://github.com/vercel-labs/skills#supported-agents)

通过 npm 安装后启动安装器。交互终端会默认勾选检测到的 Agent。用方向键移动，空格勾选或取消，回车确认。

```sh
npm install -g ui-intelligence-skill
ui-intelligence-skill
```

也可以安装 GitHub Releases 上的版本化发行包。

```sh
npm install -g https://github.com/yanhuo218/My-ui-skill/releases/download/v0.1.0/ui-intelligence-skill-0.1.0.tgz
ui-intelligence-skill
```

如果已经下载源码，在仓库根目录运行下列命令。

```sh
npm ci
npm run install:skill
```

可以多次传入 `--agent` 跳过菜单并指定 Agent。使用 `--yes` 会直接选择检测到的 Agent，非交互终端默认也是如此。常用标识包括 `codex`、`claude-code`、`cursor`、`github-copilot`、`gemini-cli`、`opencode`、`windsurf`、`cline` 和 `antigravity`。

```sh
ui-intelligence-skill --agent codex --agent claude-code --agent cursor
```

使用共享 Skill 目录的客户端也可以通过 Vercel Skills 直接安装。GitHub Copilot 的原生用户目录由仓库安装脚本写入。 [VS Code 的 Skill 目录](https://code.visualstudio.com/docs/agent-customization/agent-skills#skill-locations)

```sh
npx -y skills@1.9.0 add . --skill ui-intelligence --global --yes
```

### 自动安装的依赖

安装计划会列出各 Agent 待安装的 Skill 和待注册的 MCP。安装器先安装 Skill 和 CLI，再注册免鉴权的 MCP，最后注册 21st MCP。各 Agent 会复用已有依赖和 MCP 配置，本仓库的 Skill 内容有变动时会更新。

- **Skill** 包括 UI/UX Pro Max 和四个 21st 官方 Skill，分别是 `21st-cli-use`、`21st-ui-build`、`21st-ui-explore` 和 `21st-ui-review`。安装器会复用所选 Agent 已有的依赖。 [UI/UX Pro Max](https://github.com/nextlevelbuilder/ui-ux-pro-max-skill) · [21st 官方 Skill](https://github.com/21st-dev/skill)
- **21st CLI** 会在 PATH 中找不到 `21st` 命令时通过 npm 全局安装。
- **MCP** 包括本地聚合服务 `ui-hub`、shadcn、Magic UI、frontend-inspo 和 21st。Codex、Claude Code、Cursor、VS Code 中的 GitHub Copilot、Gemini CLI 和 OpenCode 支持自动写入用户级配置。已有配置优先，其他客户端会收到手动配置说明。旧版 `--with-mcp` 参数仍然可用。

### 手动配置

安装器会在最后输出剩余配置步骤，凭据可在安装完成后填写。

- 如果安装器新注册了 21st MCP，在 Agent 可读取的环境中设置 `API_KEY_21ST`。客户端已有 21st 配置时，沿用原有鉴权方式。 [21st 配置说明](https://21st.dev/mcp)
- 需要使用 21st CLI 时，运行 `21st login` 登录，再用 `21st whoami` 确认。
- 如果要**通过 shadcn** 使用 Magic UI，将 `@magicui` 条目并入目标应用已有的 `components.json`。 [Registry 配置](skills/ui-intelligence/references/component-sources.md)
- 重新打开 Agent 会话并检查 MCP 连接。

## UI Hub MCP

`ui-hub` 通过 stdio 在本机运行。安装器使用 Node 可执行文件及服务脚本的绝对路径来注册它。手动注册时，运行 `npm ci` 后将启动命令设为 `node`，参数填 `mcp/server.mjs` 的绝对路径。客户端启动服务时需要能访问该仓库。

| 工具 | 入参 | 输出 |
| --- | --- | --- |
| `search_components` | `query`，可选 `context`、`limit` | 排序和去重后的候选组件，以及各来源状态 |
| `get_component` | `source`、`id`，可选 `directory` | 源码文件、依赖和许可证依据 |
| `evaluate_component` | `source`、`id`、`project` | 兼容性、依赖版本范围、评分、阻塞项和待验证事项 |
| `prepare_install` | `source`、`id`、`project` | 前置条件、声明的目标路径和供 Agent 审阅的命令参数 |

根据工具要求，将目标应用的绝对路径填入 `context.directory`、`directory` 或 `project.directory`。使用搜索返回的 `source` 和 `id`。默认来源包括 shadcn、Magic UI、21st 和项目已配置的 shadcn 兼容 Registry。21st 使用官方 CLI 的登录会话或 API Key，获取源码可能消耗账户额度。

服务以只读方式检查项目和组件数据。安装或预览命令由 Agent 在任务范围内审阅并执行。 [工具参数、评分与计划状态](skills/ui-intelligence/references/component-sources.md#ui-hub-mcp)

## 使用

在目标前端项目中打开一个新的 Agent 会话，指定需要设计方向、组件推荐还是实际集成。

> 使用 ui-intelligence 为当前分析仪表盘推荐表格组件。先检查项目现有组件和主题，再按来源、依赖和适配成本比较可用候选。

要让 Agent 执行集成，可以追加“把选中的组件接入仪表盘，并运行项目已有的检查”。

工作流包括项目分析、设计方向、组件检索、候选评估、源码获取、集成和验证。 [完整工作流](skills/ui-intelligence/SKILL.md) · [组件来源](skills/ui-intelligence/references/component-sources.md)

## 验证

运行 `npm ci` 后执行 `npm run test:install`，验证 npm 发行包、全局 CLI、分阶段安装、复装，以及四个 MCP 工具对本地 Registry 的调用。GitHub Actions 会在 Linux、Windows 和 macOS 上运行这项检查。 [安装验证工作流](https://github.com/yanhuo218/My-ui-skill/actions/workflows/install.yml)
