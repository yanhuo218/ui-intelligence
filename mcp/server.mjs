import { isAbsolute } from "node:path";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { getComponent, readCatalog, searchComponents } from "./providers.mjs";
import { evaluateComponent, prepareInstall } from "./planning.mjs";

const directory = z.string().refine(isAbsolute, "Use an absolute app directory.");
const source = z.string().regex(/^(?:21st|@[\w-]+)$/).describe("A registry namespace such as @shadcn or @magicui, or 21st.");
const id = z.string().trim().min(1).max(150).describe("The ID returned by search_components.");
const framework = z.enum(["react", "react-native", "vue", "svelte", "angular", "solid", "astro", "unknown"]);
const project = z.object({
  directory,
  framework: framework.optional(),
  requiredFeatures: z.array(z.string().trim().min(1).max(120)).max(12).optional(),
  licenseReview: z.object({
    status: z.enum(["approved", "rejected"]),
    evidence: z.string().trim().min(1).max(500),
  }).optional().describe("A reuse decision the caller has verified against the upstream license."),
});
const server = new McpServer({ name: "ui-hub", version: "0.1.0" });

function register(name, description, inputSchema, run) {
  server.registerTool(name, {
    description, inputSchema,
    annotations: { readOnlyHint: true, openWorldHint: true },
  }, async (args) => {
    const text = JSON.stringify(await run(args));
    return {
      content: [{ type: "text", text }],
      structuredContent: JSON.parse(text),
    };
  });
}

register("search_components", "Search compatible registries and 21st, then rank candidates and report provider failures.", {
  query: z.string().trim().min(1).max(180),
  context: z.object({
    directory: directory.optional(),
    framework: framework.optional(),
    visualIntent: z.string().trim().max(180).optional(),
    sources: z.array(source).min(1).max(12).optional(),
  }).default({}),
  limit: z.number().int().min(1).max(20).default(8),
}, ({ query, context, limit }) => searchComponents(query, context, limit));

register("get_component", "Read an item's source, dependencies, provenance and license evidence.", {
  source, id, directory: directory.optional(),
}, async ({ source, id, directory: path }) => getComponent(source, id, await readCatalog(path)));

register("evaluate_component", "Evaluate source, framework and dependency fit for the target project.", {
  source, id, project,
}, ({ source, id, project }) => evaluateComponent(source, id, project));

register("prepare_install", "Prepare a read-only install plan with prerequisites, file targets and command arguments.", {
  source, id, project,
}, ({ source, id, project }) => prepareInstall(source, id, project));

await server.connect(new StdioServerTransport());
