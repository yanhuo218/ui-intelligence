import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import jsonc from "jsonc-parser";
import { getRegistriesConfig, getRegistryItems, resolveRegistryItems, searchRegistries } from "shadcn/registry";

const exec = promisify(execFile);
const cli = fileURLToPath(new URL("./dist/index.js", import.meta.resolve("@21st-dev/cli/package.json")));
const cliDirectory = fileURLToPath(new URL(".", import.meta.url));
const magicRegistry = "https://magicui.design/r/{name}.json";
const shadcnRegistry = "https://ui.shadcn.com/r/styles/{style}/{name}.json";
const publicLicenses = {
  "@shadcn": "https://github.com/shadcn-ui/ui/blob/main/LICENSE.md",
  "@magicui": "https://github.com/magicuidesign/magicui/blob/main/LICENSE.md",
};
const defaultSources = ["@shadcn", "@magicui", "21st"];
const catalogCache = new Map();
const catalogSlugs = new Map();

export async function readManifest(directory, name) {
  const text = await readFile(join(directory, name), "utf8").catch((error) => {
    if (error.code === "ENOENT") return undefined;
    throw error;
  });
  if (text === undefined) return undefined;
  const errors = [];
  const value = jsonc.parse(text.replace(/^\uFEFF/, ""), errors, { allowTrailingComma: true });
  if (errors.length || !value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Invalid " + name + " in the project directory.");
  }
  return value;
}

export async function readCatalog(directory) {
  const [registryConfig, components] = directory
    ? await Promise.all([
      getRegistriesConfig(directory, { useCache: false }),
      readManifest(directory, "components.json"),
    ])
    : [{ registries: {} }, undefined];
  return {
    components,
    configured: registryConfig.registries,
    config: {
      style: components?.style ?? "new-york-v4",
      registries: { "@magicui": magicRegistry, ...registryConfig.registries },
    },
  };
}

function provider(source, catalog) {
  if (!defaultSources.includes(source) && !Object.hasOwn(catalog.config.registries, source)) {
    throw new Error("Registry is not configured in the supplied project: " + source);
  }
}

function registryAddress(source, id) {
  if (/^[\w-]+$/.test(id)) return source + "/" + id;
  const matched = /^(@[\w-]+)\/[\w-]+$/.exec(id);
  if (matched?.[1] === source) return id;
  throw new Error("Provide a component name or a qualified item matching the source namespace.");
}

function verifiedOrigin(source, catalog) {
  const entry = catalog.config.registries[source];
  const url = typeof entry === "object" ? entry.url : entry;
  if (source === "@shadcn") return !entry || url === shadcnRegistry;
  return source === "@magicui" && url === magicRegistry;
}

function registryLicense(source, item, catalog) {
  if (typeof item.meta?.license === "string" && item.meta.license.trim()) {
    return { status: "declared", id: item.meta.license };
  }
  if (verifiedOrigin(source, catalog)) {
    return { status: "upstream", id: "MIT", url: publicLicenses[source] };
  }
  return { status: "unknown" };
}

function safeHttpUrl(value) {
  // 来源链接可能携带临时凭据，只公开无需查询参数的地址。
  if (typeof value !== "string") return undefined;
  const url = URL.canParse(value) ? new URL(value) : undefined;
  if (url?.protocol !== "https:" || url.username || url.password) return undefined;
  return url.origin + url.pathname;
}

function registryUrl(source, id, catalog) {
  const name = id.split("/").at(-1);
  const entry = catalog.config.registries[source];
  const template = typeof entry === "string" ? entry : entry?.url ?? (source === "@shadcn" ? shadcnRegistry : undefined);
  return safeHttpUrl(template?.replace("{name}", name).replace("{style}", catalog.config.style));
}

function registryFramework(source, item, catalog) {
  if (verifiedOrigin(source, catalog)) return "react";
  const paths = (item.files ?? []).map((file) => file.path);
  const dependencies = (item.dependencies ?? []).join(" ");
  const code = (item.files ?? []).map((file) => file.content).join("\n");
  if (/\breact-native\b/.test(dependencies) || /["']react-native(?:\/|["'])/.test(code)) return "react-native";
  if (paths.some((path) => path.endsWith(".vue"))) return "vue";
  if (paths.some((path) => path.endsWith(".svelte"))) return "svelte";
  if (paths.some((path) => path.endsWith(".astro"))) return "astro";
  if (/\breact(?:-dom)?(?:@|\s|$)/.test(dependencies)
    || /["'](?:react(?:-dom)?|next)(?:\/|["'])/.test(code)) return "react";
  return undefined;
}

async function run21st(args) {
  try {
    const { stdout } = await exec(process.execPath, [cli, ...args, "--json"], {
      cwd: cliDirectory, timeout: 15000, maxBuffer: 2 * 1024 * 1024, windowsHide: true,
    });
    return JSON.parse(stdout);
  } catch (error) {
    const detail = String(error.stderr ?? "");
    if (/not signed in|unauthenticated|unauthorized|\b401\b|API key/i.test(detail)) {
      throw new Error("21st authentication required. Run 21st login or provide API_KEY_21ST.");
    }
    if (/locked|quota|rate limit|paid|\b429\b/i.test(detail + " " + error.stdout)) {
      throw new Error("21st denied access or the retrieval quota is exhausted.");
    }
    if (/not found|"found":\s*false/i.test(detail + " " + error.stdout)) {
      throw new Error("The 21st component could not be found.");
    }
    // CLI 的上游错误可能包含请求细节，仅返回可供用户处理的状态。
    throw new Error(error.killed ? "21st request timed out." : "21st could not complete the request.");
  }
}

function asSlug(item, id) {
  const slug = item.slug ?? item.componentSlug ?? item.component_slug;
  if (typeof slug !== "string") return catalogSlugs.get(id);
  const author = typeof item.author === "string" ? item.author : item.author?.username;
  const qualified = slug.includes("/") ? slug : author && author + "/" + slug;
  return /^[\w-]+\/[\w-]+$/.test(qualified ?? "") ? qualified : catalogSlugs.get(id);
}

async function searchProvider(source, query, catalog, limit) {
  provider(source, catalog);
  if (source === "21st") {
    // 21st 的 CLI 会解析以 -- 开头的参数，禁止将这类内容作为查询。
    if (query.startsWith("-")) throw new Error("Search terms must start with a word or number.");
    const items = await run21st(["search", query, "--type", "c", "--limit", String(limit)]);
    return items.flatMap((item) => {
      const id = String(item.id);
      if (!/^\d+$/.test(id)) return [];
      const slug = asSlug(item, id);
      if (slug) {
        if (catalogSlugs.size >= 100) catalogSlugs.delete(catalogSlugs.keys().next().value);
        catalogSlugs.set(id, slug);
      }
      return [{
        source, id, name: item.name ?? item.title ?? slug ?? id,
        description: item.description, type: item.type ?? "component", slug,
        url: safeHttpUrl(item.url), framework: "react",
      }];
    });
  }
  const result = await searchRegistries([source], { query, config: catalog.config, limit, useCache: false });
  return result.items.map((item) => ({
    source, id: item.addCommandArgument, name: item.title ?? item.name,
    description: item.description, type: item.type,
    url: registryUrl(source, item.addCommandArgument, catalog),
    framework: verifiedOrigin(source, catalog) ? "react" : undefined,
  }));
}

const terms = (value = "") => value.toLowerCase().match(/[\p{L}\p{N}]+/gu) ?? [];

export async function searchComponents(query, context, limit) {
  const catalog = await readCatalog(context.directory);
  const sources = [...new Set(context.sources ?? [...defaultSources, ...Object.keys(catalog.configured)])];
  const keywords = [...new Set(terms(query))];
  const visual = terms(context.visualIntent);
  const found = await Promise.allSettled(sources.map((source) => searchProvider(source, query, catalog, limit)));
  const unique = new Map();
  const sourcesStatus = found.map((result, index) => {
    const source = sources[index];
    if (result.status === "rejected") {
      return { source, status: "unavailable", message: providerMessage(source, result.reason) };
    }
    result.value.forEach((item, position) => {
      if (context.framework && item.framework && context.framework !== item.framework) return;
      const name = terms(item.name);
      const description = terms(item.description);
      const relevance = keywords.reduce((score, term) => score + (name.includes(term) ? 12 : description.includes(term) ? 4 : 0), 0)
        + visual.filter((term) => name.includes(term) || description.includes(term)).length * 2
        + (position === 0 ? 1 : 0) - (item.type === "registry:example" ? 8 : 0);
      const key = verifiedOrigin(source, catalog) && item.url ? item.url : source + ":" + item.id;
      if (!unique.has(key) || unique.get(key).relevance < relevance) {
        unique.set(key, { ...item, relevance });
      }
    });
    return { source, status: "ok", matches: result.value.length };
  });
  return {
    query,
    items: [...unique.values()].sort((left, right) =>
      right.relevance - left.relevance || left.name.localeCompare(right.name)).slice(0, limit),
    sources: sourcesStatus,
  };
}

function providerMessage(source, error) {
  if (source === "21st") return error.message;
  return "Registry request failed. Check the namespace, URL, and credentials in the project configuration.";
}

async function catalogItem(id) {
  const cached = catalogCache.get(id);
  if (cached && cached.expires > Date.now()) return cached.result;
  if (catalogCache.size >= 32) catalogCache.delete(catalogCache.keys().next().value);
  const result = run21st(["get", id]);
  catalogCache.set(id, { result, expires: Date.now() + 300000 });
  return result.catch((error) => {
    if (catalogCache.get(id)?.result === result) catalogCache.delete(id);
    throw error;
  });
}

export async function getComponent(source, id, catalog) {
  provider(source, catalog);
  if (source === "21st") {
    if (!/^\d{1,15}$/.test(id)) throw new Error("Use the numeric ID returned by 21st search.");
    const payload = await catalogItem(id);
    const item = payload.component ?? payload;
    const code = item.code ?? item.sourceCode ?? item.componentCode ?? payload.code;
    const files = Array.isArray(item.files) ? item.files
      : typeof code === "string" && code.trim() ? [{ content: code }] : [];
    const license = item.license ?? payload.license;
    return {
      source, id, name: item.name ?? item.title ?? id, slug: asSlug(item, id),
      description: item.description, framework: "react", type: "component",
      url: safeHttpUrl(item.url),
      license: typeof license === "string" && license.trim()
        ? { status: "declared", id: license } : { status: "unknown" },
      files, dependencies: Array.isArray(item.dependencies) ? item.dependencies : [],
      sourceAvailable: files.some((file) => typeof file?.content === "string" && file.content.trim()),
    };
  }
  const address = registryAddress(source, id);
  const [item] = await getRegistryItems([address], { config: catalog.config, useCache: false }).catch((error) => {
    throw new Error(providerMessage(source, error));
  });
  if (!item) throw new Error("The registry did not return the requested component.");
  return {
    source, id: address, name: item.title ?? item.name, description: item.description, type: item.type,
    url: registryUrl(source, address, catalog),
    framework: registryFramework(source, item, catalog),
    license: registryLicense(source, item, catalog),
    dependencies: item.dependencies ?? [], devDependencies: item.devDependencies ?? [],
    registryDependencies: item.registryDependencies ?? [], files: item.files ?? [],
    sourceAvailable: item.files?.some((file) => file.content?.trim()) ?? false,
    css: item.css, cssVars: item.cssVars, docs: item.docs,
  };
}

export async function resolveInstallTree(component, catalog) {
  if (component.source === "21st") return component;
  const tree = await resolveRegistryItems([component.id], { config: catalog.config, useCache: false }).catch((error) => {
    throw new Error(providerMessage(component.source, error));
  });
  if (!tree) throw new Error("The registry did not return an install tree.");
  return tree;
}
