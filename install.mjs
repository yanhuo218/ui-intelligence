#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs } from "node:util";
import { isCancel, multiselect } from "@clack/prompts";
import jsonc from "jsonc-parser";
import { detectAgents, getSupportedAgents, installSkills, listSkills } from "skills";

const repository = fileURLToPath(new URL(".", import.meta.url));
const userDir = homedir();
const configDir = process.env.XDG_CONFIG_HOME || join(userDir, ".config");
const windows = process.platform === "win32";
const windowsLauncher = windows ? ["cmd.exe", "/d", "/c"] : [];
const npxCommand = [...windowsLauncher, "npx", "-y"];
const localServers = {
  "ui-hub": [process.execPath, join(repository, "mcp", "server.mjs")],
  shadcn: [...npxCommand, "shadcn@4.23.0", "mcp"],
  "magic-ui": [...npxCommand, "@magicuidesign/mcp@2.1.1"],
  "frontend-inspo": [...npxCommand, "frontend-inspo-mcp@0.3.0"],
};
const remoteUrl = "https://21st.dev/api/mcp";
const tokenVariable = "API_KEY_21ST";
const tokenReference = "$" + "{API_KEY_21ST}";
const coreSkill = "ui-intelligence";
const coreDirectory = join(repository, "skills", coreSkill);
const skillSources = [
  { source: coreDirectory, names: [coreSkill] },
  { source: "nextlevelbuilder/ui-ux-pro-max-skill", names: ["ui-ux-pro-max"] },
  { source: "21st-dev/skill", names: ["21st-cli-use", "21st-ui-build", "21st-ui-explore", "21st-ui-review"] },
];
const skillNames = skillSources.flatMap(({ names }) => names);
const skillOptions = { cwd: repository, scope: "global", telemetry: false };
const twentyFirstPackage = "@21st-dev/cli@1.18.0";
const jsonOptions = { allowTrailingComma: true };
const formattingOptions = { insertSpaces: true, tabSize: 2 };

function run([program, ...args], options = {}) {
  const result = spawnSync(program, args, {
    cwd: userDir,
    stdio: ["inherit", "inherit", "inherit"],
    ...options,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${program} 执行失败（${result.status ?? result.signal}）`);
  }
  return result.stdout;
}

async function addSkills(source, names, agents, options = {}) {
  const result = await installSkills(source, { ...skillOptions, ...options, skills: names, agents });
  for (const { skill, agent } of result.installed) console.log(`已安装 Skill ${skill}（${agent}）`);
  const incomplete = [...result.failed, ...result.skipped];
  if (incomplete.length) {
    throw new Error(incomplete.map(({ skill, agent, message, reason }) =>
      `${skill}（${agent}）${message ?? reason}`).join("\n"));
  }
}

function planSkills(target, existing, coreFiles) {
  return skillNames.map((name) => {
    const native = join(target.globalSkillsDir, name);
    const shared = existing.find((skill) => skill.name === name && skill.agents.includes(target.id))?.path;
    const installed = existsSync(join(native, "SKILL.md")) ? native : shared;
    const current = target.id === "github-copilot" ? native : installed;
    const update = name === coreSkill && current && coreFiles.some(([path, contents]) => {
      const file = join(current, path);
      return !existsSync(file) || !readFileSync(file).equals(contents);
    });
    const copy = target.id === "github-copilot" && (!existsSync(join(native, "SKILL.md")) || update);
    const install = !installed || (update && target.id !== "github-copilot");
    return { name, install, copy };
  });
}

async function installPlannedSkills(plans) {
  for (const { source, names } of skillSources) {
    const missing = new Map();
    for (const { target, skills } of plans) {
      const namesToInstall = skills.filter((skill) => skill.install && names.includes(skill.name))
        .map(({ name }) => name);
      if (namesToInstall.length) {
        const key = namesToInstall.join(",");
        if (!missing.has(key)) missing.set(key, []);
        missing.get(key).push(target.id);
      }
    }
    for (const [key, missingAgents] of missing) {
      await addSkills(source, key.split(","), missingAgents, { mode: "copy" });
    }
  }
  const copilot = plans.find(({ target }) => target.id === "github-copilot");
  const namesToCopy = copilot?.skills.filter(({ copy }) => copy).map(({ name }) => name);
  if (namesToCopy?.length) {
    const { skills } = await listSkills({ ...skillOptions, agents: [copilot.target.id] });
    for (const name of namesToCopy) {
      const destination = join(copilot.target.globalSkillsDir, name);
      const source = name === coreSkill ? coreDirectory : skills.find((skill) => skill.name === name)?.path;
      if (!source) throw new Error(`找不到 GitHub Copilot 的 Skill 来源 ${name}`);
      if (source !== destination) cpSync(source, destination, { recursive: true });
      console.log(`已同步 Skill ${name}（github-copilot）`);
    }
  }
}

function hasCommand(command) {
  const probe = windows ? ["where.exe", command] : ["sh", "-c", 'command -v "$1"', "sh", command];
  const [program, ...args] = probe;
  const found = spawnSync(program, args, { stdio: "ignore" });
  if (found.error) throw found.error;
  return found.status === 0;
}

function inspectCodexServers() {
  if (!hasCommand("codex")) return undefined;
  const nativeCodex = windows && hasCommand("codex.exe");
  const codexMcp = nativeCodex ? ["codex.exe", "mcp"] : [...windowsLauncher, "codex", "mcp"];
  const output = run([...codexMcp, "list", "--json"], {
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
  const configured = JSON.parse(output);
  const names = new Set(configured.map(({ name }) => name));
  if (configured.some(({ transport }) => transport?.url === remoteUrl)) names.add("21st");
  return {
    names,
    addLocal: (missing) => {
      for (const name of missing) run([...codexMcp, "add", name, "--", ...localServers[name]]);
    },
    addRemote: () => run([...codexMcp, "add", "21st", "--url", remoteUrl, "--bearer-token-env-var", tokenVariable]),
  };
}

function readJsonServers(file, section) {
  const exists = existsSync(file);
  const path = exists ? realpathSync(file) : file;
  const raw = exists ? readFileSync(path, "utf8") : "{}\n";
  const bom = raw.startsWith("\uFEFF") ? "\uFEFF" : "";
  const original = raw.slice(bom.length);
  const errors = [];
  const tree = jsonc.parseTree(original, errors, jsonOptions);
  if (errors.length || tree?.type !== "object") {
    throw new Error(`配置文件不是有效的 JSON 对象：${file}`);
  }

  const sectionPath = typeof section === "function" ? section(tree) : section;
  for (let depth = 1; depth <= sectionPath.length; depth++) {
    const node = jsonc.findNodeAtLocation(tree, sectionPath.slice(0, depth));
    if (node && node.type !== "object") {
      throw new Error(`MCP 配置需要是对象：${file} 的 ${sectionPath.slice(0, depth).join(".")}`);
    }
  }

  const existing = jsonc.findNodeAtLocation(tree, sectionPath);
  const names = new Set(existing?.children.map((property) => property.children[0].value));
  if (existing?.children.some((property) =>
    ["url", "httpUrl"].some((key) =>
      jsonc.findNodeAtLocation(property.children[1], [key])?.value === remoteUrl))) names.add("21st");
  return { exists, path, bom, original, sectionPath, names };
}

function updateJsonServers(file, section, entries) {
  const { exists, path, bom, original, sectionPath, names } = readJsonServers(file, section);
  let updated = original;
  for (const [name, entry] of entries) {
    if (!names.has(name)) {
      updated = jsonc.applyEdits(updated, jsonc.modify(updated, [...sectionPath, name], entry(sectionPath), {
        formattingOptions: { ...formattingOptions, eol: original.includes("\r\n") ? "\r\n" : "\n" },
      }));
    }
  }
  if (updated === original) return;

  mkdirSync(dirname(path), { recursive: true });
  const temporary = `${path}.${randomUUID()}.tmp`;
  const mode = exists ? statSync(path).mode & 0o777 : 0o600;
  writeFileSync(temporary, bom + updated, { flag: "wx", mode });
  try {
    renameSync(temporary, path);
  } finally {
    rmSync(temporary, { force: true });
  }
  console.log(`已配置 MCP：${file}`);
}

function inspectJsonServers(file, section, localEntry, remoteEntry) {
  return {
    names: readJsonServers(file, section).names,
    addLocal: (missing) => updateJsonServers(file, section, missing.map((name) =>
      [name, (sectionPath) => localEntry(localServers[name], sectionPath)])),
    addRemote: () => updateJsonServers(file, section, [["21st", () => remoteEntry]]),
  };
}

function stdio([command, ...args]) {
  return { command, args };
}

function remoteHttp(reference) {
  return { type: "http", url: remoteUrl, headers: { "x-api-key": reference } };
}

function inspectOpenCodeServers() {
  const directory = join(configDir, "opencode");
  const json = join(directory, "opencode.json");
  const jsoncFile = join(directory, "opencode.jsonc");
  const file = process.env.OPENCODE_CONFIG || (existsSync(jsoncFile) ? jsoncFile : json);
  return inspectJsonServers(file, (tree) => {
    // OpenCode 1.x 使用 mcp，已采用 2.x 格式的配置继续使用 mcp.servers。
    const section = ["mcp", "servers"];
    const nested = jsonc.findNodeAtLocation(tree, section);
    const legacy = jsonc.findNodeAtLocation(tree, [...section, "type"])?.type === "string";
    return nested && !legacy ? section : ["mcp"];
  }, (command, section) => ({
    type: "local",
    command,
    ...(section.length === 1 ? { enabled: true } : {}),
  }), { ...remoteHttp("{env:API_KEY_21ST}"), type: "remote", oauth: false });
}

const editorTokenReference = "$" + "{env:API_KEY_21ST}";

function inspectVSCodeServers() {
  const platformPaths = {
    win32: process.env.APPDATA || join(userDir, "AppData", "Roaming"),
    darwin: join(userDir, "Library", "Application Support"),
  };
  return inspectJsonServers(join(platformPaths[process.platform] || configDir, "Code", "User", "mcp.json"),
    ["servers"], (command) => ({ type: "stdio", ...stdio(command) }), remoteHttp(editorTokenReference));
}

const mcpInspectors = {
  codex: inspectCodexServers,
  "claude-code": () => inspectJsonServers(
    join(process.env.CLAUDE_CONFIG_DIR || userDir, ".claude.json"), ["mcpServers"],
    (command) => ({ type: "stdio", ...stdio(command) }),
    remoteHttp(tokenReference),
  ),
  cursor: () => inspectJsonServers(join(userDir, ".cursor", "mcp.json"), ["mcpServers"], stdio,
    remoteHttp(editorTokenReference)),
  "gemini-cli": () => inspectJsonServers(join(userDir, ".gemini", "settings.json"), ["mcpServers"], stdio,
    { httpUrl: remoteUrl, headers: { "x-api-key": tokenReference } }),
  opencode: inspectOpenCodeServers,
  "github-copilot": inspectVSCodeServers,
};

const { values } = parseArgs({
  options: {
    agent: { type: "string", short: "a", multiple: true },
    yes: { type: "boolean", short: "y" },
    "with-mcp": { type: "boolean" },
    help: { type: "boolean", short: "h" },
  },
});
if (values.help) {
  console.log("用法 npm run install:skill -- [--agent <客户端> ... | --yes]");
  console.log("默认交互选择 Agent。--yes 直接使用检测到的 Agent。");
  console.log(`可自动配置 MCP 的客户端：${Object.keys(mcpInspectors).join("、")}`);
  process.exit(0);
}

const supported = getSupportedAgents().filter(({ globalSkillsDir }) => globalSkillsDir);
const requested = [...new Set(values.agent ?? [])];
const unknown = requested.filter((id) => id !== "*" && !supported.some((agent) => agent.id === id));
if (unknown.length) {
  throw new Error(`不支持用户级安装的客户端 ${unknown.join("、")}`);
}
const detected = requested.length ? [] : (await detectAgents({ cwd: repository })).agents;
let selectedIds = requested.length ? requested : detected.map(({ id }) => id);
if (!requested.length && !values.yes && process.stdin.isTTY && process.stdout.isTTY) {
  const detectedIds = new Set(selectedIds);
  const ordered = [...supported].sort((left, right) => Number(detectedIds.has(right.id)) - Number(detectedIds.has(left.id)));
  const selection = await multiselect({
    message: "选择要安装的 Agent（↑↓ 移动，空格勾选，Enter 确认）",
    options: ordered.map(({ id, name }) => ({
      value: id,
      label: name,
      hint: detectedIds.has(id) ? "本机已检测" : id,
    })),
    initialValues: ordered.filter(({ id }) => detectedIds.has(id)).map(({ id }) => id),
    maxItems: 12,
    required: true,
  });
  if (isCancel(selection)) {
    console.log("已取消安装。");
    process.exit(130);
  }
  selectedIds = selection;
}
const selected = supported.filter(({ id }) => selectedIds.includes("*") || selectedIds.includes(id));
const targets = selected.length ? selected : supported.filter(({ id }) => id === "universal");
const agents = targets.map(({ id }) => id);

const { skills: installed } = await listSkills({ ...skillOptions, agents });
const coreFiles = readdirSync(coreDirectory, { recursive: true, withFileTypes: true })
  .filter((file) => file.isFile())
  .map((file) => {
    const path = join(relative(coreDirectory, file.parentPath), file.name);
    return [path, readFileSync(join(coreDirectory, path))];
  });
const plans = targets.map((target) => {
  const mcp = Object.hasOwn(mcpInspectors, target.id) ? mcpInspectors[target.id]() : undefined;
  return {
    target, mcp,
    skills: planSkills(target, installed, coreFiles),
    local: mcp ? Object.keys(localServers).filter((name) => !mcp.names.has(name)) : [],
    remote: mcp && !mcp.names.has("21st"),
  };
});
const needsCli = !hasCommand("21st");

console.log("\n安装计划");
for (const { target, skills, mcp, local, remote } of plans) {
  const pending = skills.filter(({ install, copy }) => install || copy).map(({ name }) => name);
  const existing = skills.filter(({ name }) => !pending.includes(name)).map(({ name }) => name);
  console.log(`- ${target.name}（${target.id}）`);
  console.log(`  Skill 待安装或更新 ${pending.join("、") || "无"}`);
  console.log(`  Skill 已有 ${existing.join("、") || "无"}`);
  if (mcp) {
    console.log(`  免配置 MCP 待注册 ${local.join("、") || "无"}`);
    console.log(`  需鉴权 MCP 待注册 ${remote ? "21st" : "无"}`);
    const configured = [...Object.keys(localServers), "21st"].filter((name) => mcp.names.has(name));
    console.log(`  MCP 已配置 ${configured.join("、") || "无"}`);
  } else if (target.id !== "universal") {
    console.log("  MCP 由客户端手动配置");
  }
}
console.log(`- 21st CLI ${needsCli ? "待安装" : "已有"}`);

console.log("\n1. 安装 Skill");
await installPlannedSkills(plans);
if (needsCli) run([...windowsLauncher, "npm", "install", "--global", twentyFirstPackage]);

console.log("\n2. 注册免配置 MCP");
for (const { mcp, local } of plans) {
  if (local.length) mcp.addLocal(local);
}

console.log("\n3. 注册需鉴权 MCP");
for (const { mcp, remote } of plans) {
  if (remote) mcp.addRemote();
}

const manualAgents = plans.filter(({ target, mcp }) => !mcp && target.id !== "universal")
  .map(({ target }) => target.id);
console.log("\n手动配置");
if (manualAgents.length) {
  console.log(`- ${manualAgents.join("、")} 的 MCP 需要在客户端配置。`);
  if (manualAgents.includes("codex")) console.log("- 将 Codex CLI 加入 PATH 后可用 --agent codex 自动注册。");
  for (const [name, command] of Object.entries(localServers)) {
    console.log(`  ${name}    ${JSON.stringify(stdio(command))}`);
  }
}
if (!process.env[tokenVariable]) {
  console.log(`- 如需使用 21st MCP，将 API Key 设置为客户端可读取的环境变量 ${tokenVariable}。`);
}
console.log("- 现有 21st MCP 可继续使用原有鉴权方式。检查连接或为其他客户端配置 https://21st.dev/mcp");
console.log("- 如 21st CLI 尚未登录，运行 21st login，然后用 21st whoami 确认。");
console.log('- 通过 shadcn 使用 Magic UI 时，将 "@magicui": "https://magicui.design/r/{name}.json" 合并到目标项目 components.json 的 registries。');
console.log("- 完成后重新打开 Agent 会话并检查 MCP 连接。");
