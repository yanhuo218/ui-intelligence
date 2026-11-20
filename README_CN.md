# UI Intelligence

[English](README.md) · [发行版本](https://github.com/yanhuo218/My-ui-skill/releases)

UI Intelligence 为编程 Agent 提供一套现有项目的 UI 工作流，可用于设计、推荐组件、审查界面和集成实现。它先检查项目已有组件和设计 Token。需要外部代码时，内置的 UI Hub MCP 可以搜索 Registry、检查源码、评估兼容性并生成安装计划。Agent 审阅计划后，在用户授权的任务范围内执行。

## 包含的能力

- **UI Intelligence Skill** 提供项目检查、设计决策、组件选型、开发和验证流程。
- **UI Hub MCP** 统一搜索 shadcn、Magic UI、21st 和目标项目配置的 shadcn 兼容 Registry。
- **辅助工具** 包括用于设计指导的 UI/UX Pro Max、四项 21st 官方 Skill 和 CLI，以及独立的 shadcn、Magic UI、frontend-inspo 和 21st MCP。按任务需要调用相应工具。 [工具用途和要求](skills/ui-intelligence/references/component-sources.md#tool-selection)

## 环境要求和客户端支持

Windows、macOS 和 Linux 均可使用，需安装 Node.js 22.20 或更高版本、npm 和 Git。安装依赖和访问外部组件库需要联网。UI/UX Pro Max 的搜索脚本需要 Python 3。

安装器可为 Codex、Claude Code、Cursor、VS Code GitHub Copilot、Gemini CLI 和 OpenCode 自动注册用户级 MCP。要自动注册 Codex，把 Codex CLI 加入 PATH。其他支持的 Agent 可安装 Skill，并使用各自的 MCP 配置方式。 [支持的 Agent ID](https://github.com/vercel-labs/skills#supported-agents)

## 手动安装

### 1. 安装命令行工具

使用 GitHub 发行包。命令中的参数允许 npm 12 在本次安装中获取明确指定的远程包。

```sh
npm install -g --allow-remote=root https://github.com/yanhuo218/My-ui-skill/releases/download/v0.1.1/ui-intelligence-skill-0.1.1.tgz
```

对应版本在 npm 上可用后，也可按包名安装。 [查看 npm 发布状态](https://www.npmjs.com/package/ui-intelligence-skill)

```sh
npm install -g ui-intelligence-skill@0.1.1
```

### 2. 选择 Agent

```sh
ui-intelligence-skill
```

安装器会默认勾选检测到的 Agent。用方向键移动，空格勾选或取消，回车确认。安装器会列出各客户端的缺项，依次安装 Skill 和 CLI、注册免鉴权 MCP、注册 21st MCP。已有的依赖 Skill 和 MCP 条目会被复用。

脚本安装可以传入一个或多个明确的 Agent ID。使用 `--yes` 会选择所有检测到的 Agent，非交互运行且未指定 Agent 时也采用此行为。

```sh
ui-intelligence-skill --agent codex --agent claude-code
```

从源码安装时，在仓库根目录运行。

```sh
npm ci
npm run install:skill -- --agent claude-code
```

### 3. 完成配置

- **UI Hub** 使用本地 stdio。需要手动注册的客户端，将启动命令设为 `node`，唯一参数填入 `mcp/server.mjs` 的绝对路径。全局安装时，通过 `npm root -g` 找到其下的 `ui-intelligence-skill` 目录。从源码安装时，先运行 `npm ci` 并使用仓库内的路径。配置后让客户端持续可访问该路径。
- **21st**。新注册的远程 21st MCP 需要在 Agent 进程可读取的环境中设置 `API_KEY_21ST`。已有配置时沿用能工作的鉴权方式。官方 CLI 和 UI Hub 内部的 21st 来源可使用 `21st login` 或进程环境中的 API Key。用 `21st whoami` 确认 CLI 会话。获取代码受账号权限和额度约束。 [21st MCP 配置](https://21st.dev/mcp) · [21st CLI 鉴权](https://help.21st.dev/cli)
- **通过 shadcn 使用 Magic UI**。将 `"@magicui": "https://magicui.design/r/{name}.json"` 合并到目标应用已有的 `components.json` 的 `registries` 下，沿用同名的既有配置。配置项目安装之前，UI Hub 已可检索公开组件。 [Registry 配置说明](skills/ui-intelligence/references/component-sources.md#shadcn-and-magic-ui)
- 重启 Agent 并确认它能发现 `ui-intelligence`。从目标应用做一次仅搜索的验证，查看真实调用和结果。

对于使用 `mcpServers` JSON 配置的客户端，可把下面的条目合并到已有配置中，并替换为本机的绝对路径。VS Code 使用 `servers` 字段。 [VS Code MCP 配置说明](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)

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

首次验证连接时，可让 Agent 调用 `search_components` 搜索 `card`，并将 `context.sources` 设为 `["@shadcn"]`。这个检查在配置 21st 凭据前即可运行。

## 让 Agent 自动安装

把下列提示词发给能运行终端命令的 Agent。按自己的客户端替换 `claude-code`。

> 请为 `claude-code` 安装 UI Intelligence v0.1.1。先检查 Node.js、npm 和 Git，再执行 `npm install -g --allow-remote=root https://github.com/yanhuo218/My-ui-skill/releases/download/v0.1.1/ui-intelligence-skill-0.1.1.tgz` 和 `ui-intelligence-skill --agent claude-code`。保留已有配置，安装阶段保持项目文件只读。报告新增或复用的 Skill、MCP，以及需要我完成的配置。需要凭据时，提示我在聊天之外完成设置。客户端重新加载后，确认能发现 `ui-intelligence`，只用 `@shadcn` 执行一次 UI Hub 的 `card` 只读搜索，并报告实际工具结果或具体阻塞原因。

## 使用 Skill

在目标应用中开启新的 Agent 会话，说明你需要的交付内容，以及对新增依赖和外部来源的限制。

- **仅推荐。** “使用 `ui-intelligence` 比较紧凑且支持键盘排序的表格方案。先查找现有组件，再给出候选、取舍和待验证事项。”
- **集成。** “使用 `ui-intelligence` 为分析页面集成紧凑且支持键盘排序的表格。复用现有 Token 和行为，审阅外部安装计划，并运行应用已有的检查。”
- **审查。** “使用 `ui-intelligence` 审查分析表格在宽屏、窄屏及键盘操作下的表现，列出有依据的问题。”

项目检查、来源选择、开发约束和验证标准见 [Skill 工作流](skills/ui-intelligence/SKILL.md)。

## UI Hub MCP 参考

| 工具 | 用途 |
| --- | --- |
| `search_components` | 搜索各来源，返回排序后的候选和来源可用状态。 |
| `get_component` | 获取候选的源码文件、依赖和许可证依据。 |
| `evaluate_component` | 检查框架和依赖兼容性，返回阻塞项及待验证事项。 |
| `prepare_install` | 生成只读安装计划，返回前置条件、文件目标和可用的命令参数。 |

传入目标应用的绝对路径，沿用搜索结果中的 `source` 和 `id`。执行命令前先审阅计划。 [参数、评分和计划状态](skills/ui-intelligence/references/component-sources.md#ui-hub-mcp)

## 验证

运行 `npm ci` 后执行 `npm run test:install`，可验证 npm 打包、全局 CLI 安装、Skill 和 MCP 注册、重复安装，以及四个 MCP 工具对本地 Registry 的调用。GitHub Actions 会在 Linux、Windows 和 macOS 上运行。 [安装验证工作流](https://github.com/yanhuo218/My-ui-skill/actions/workflows/install.yml)

[MIT 许可证](LICENSE)
