import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { promisify } from "node:util";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";

const exec = promisify(execFile);
const npm = process.env.npm_execpath;
assert(npm, "请通过 npm run test:install 执行。");
const root = await mkdtemp(join(tmpdir(), "ui-hub-npm-"));
const prefix = join(root, "global");
const claude = join(root, "claude");
const binDirectory = process.platform === "win32" ? prefix : join(prefix, "bin");
const client = new Client({ name: "ui-hub-install-check", version: "0.1.0" });
const env = {
  ...process.env,
  CLAUDE_CONFIG_DIR: claude,
  npm_config_prefix: prefix,
  PATH: binDirectory + delimiter + process.env.PATH,
};
const runNpm = async (args, cwd = process.cwd()) => {
  const { stdout } = await exec(process.execPath, [npm, ...args], { cwd, env, timeout: 360000 });
  return stdout;
};

const item = {
  name: "fixture-card",
  type: "registry:ui",
  title: "Fixture Card",
  files: [{ path: "ui/fixture-card.tsx", type: "registry:ui", content: 'import "react"; export const Card = () => null;' }],
  dependencies: ["react@^19"],
  meta: { license: "MIT" },
};
const fixture = createServer((request, response) => {
  const path = new URL(request.url, "http://127.0.0.1").pathname;
  response.setHeader("Content-Type", "application/json");
  if (path === "/registry.json") {
    response.end(JSON.stringify({ name: "fixture", homepage: "https://example.com", items: [item] }));
  } else if (path === "/fixture-card.json") {
    response.end(JSON.stringify(item));
  } else {
    response.writeHead(404).end("{}");
  }
});

try {
  const [pack] = Object.values(JSON.parse(await runNpm(["pack", "--json", "--pack-destination", root])));
  const entries = pack.files.map(({ path }) => path);
  for (const path of ["LICENSE", "install.mjs", "mcp/server.mjs", "skills/ui-intelligence/SKILL.md"]) {
    assert(entries.includes(path), path);
  }

  await runNpm(["install", "-g", join(root, pack.filename), "--no-audit", "--no-fund"]);
  const globalModules = (await runNpm(["root", "-g"])).trim();
  const packageDirectory = join(globalModules, "ui-intelligence-skill");
  const bin = join(binDirectory, process.platform === "win32" ? "ui-intelligence-skill.cmd" : "ui-intelligence-skill");
  const install = process.platform === "win32"
    ? () => exec("cmd.exe", ["/d", "/c", "ui-intelligence-skill", "--agent", "claude-code"], { env, timeout: 360000 })
    : () => exec(bin, ["--agent", "claude-code"], { env, timeout: 360000 });
  await stat(bin);
  const first = await install();
  assert(first.stdout.includes("注册需鉴权 MCP"));
  const skill = join(claude, "skills", "ui-intelligence", "SKILL.md");
  assert.match(await readFile(skill, "utf8"), /^name: ui-intelligence$/m);
  for (const name of ["ui-ux-pro-max", "21st-cli-use", "21st-ui-build", "21st-ui-explore", "21st-ui-review"]) {
    await stat(join(claude, "skills", name, "SKILL.md"));
  }
  const config = join(claude, ".claude.json");
  const before = await readFile(config, "utf8");
  const { mcpServers } = JSON.parse(before);
  assert.deepEqual(Object.keys(mcpServers), ["ui-hub", "shadcn", "magic-ui", "frontend-inspo", "21st"]);
  assert.equal(await realpath(mcpServers["ui-hub"].args[0]), await realpath(join(packageDirectory, "mcp", "server.mjs")));
  assert.equal(mcpServers["21st"].headers["x-api-key"], "$" + "{API_KEY_21ST}");
  const repeat = await install();
  assert(repeat.stdout.includes("Skill 待安装或更新 无"));
  assert.equal(await readFile(config, "utf8"), before);

  await new Promise((resolve) => fixture.listen(0, "127.0.0.1", resolve));
  const app = join(root, "app");
  await mkdir(app);
  const manifest = JSON.stringify({ dependencies: { react: "^19.0.0" } });
  const components = JSON.stringify({
    style: "new-york",
    tailwind: { config: "", css: "app.css", baseColor: "neutral", cssVariables: true },
    aliases: { components: "@/components", utils: "@/utils" },
    registries: { "@fixture": "http://127.0.0.1:" + fixture.address().port + "/{name}.json" },
  });
  await writeFile(join(app, "package.json"), manifest);
  await writeFile(join(app, "components.json"), components);
  const server = mcpServers["ui-hub"];
  await client.connect(new StdioClientTransport({ command: server.command, args: server.args }));
  assert.deepEqual((await client.listTools()).tools.map(({ name }) => name), [
    "search_components", "get_component", "evaluate_component", "prepare_install",
  ]);
  const search = await client.callTool({
    name: "search_components",
    arguments: { query: "card", context: { directory: app, sources: ["@fixture"] } },
  });
  const [{ source, id }] = search.structuredContent.items;
  assert.equal(id, "@fixture/fixture-card");
  const fetched = await client.callTool({ name: "get_component", arguments: { source, id, directory: app } });
  assert.equal(fetched.structuredContent.sourceAvailable, true);
  const project = { directory: app, licenseReview: { status: "approved", evidence: "测试 Registry 的 MIT 许可" } };
  const score = await client.callTool({ name: "evaluate_component", arguments: { source, id, project } });
  assert.equal(score.structuredContent.framework.status, "compatible");
  const plan = await client.callTool({ name: "prepare_install", arguments: { source, id, project } });
  assert.equal(plan.structuredContent.status, "ready_for_review");
  assert(plan.structuredContent.preview.args.includes("--dry-run"));
  assert.equal(await readFile(join(app, "package.json"), "utf8"), manifest);
  assert.equal(await readFile(join(app, "components.json"), "utf8"), components);
  console.log("npm 全局安装、Skill 和 MCP 注册、复装与四个 MCP 工具均通过。");
} finally {
  await client.close();
  await new Promise((resolve) => fixture.close(resolve));
  await rm(root, { recursive: true, force: true });
}
