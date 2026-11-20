import { existsSync } from "node:fs";
import { isAbsolute, posix, win32 } from "node:path";
import semver from "semver";
import { rawConfigSchema } from "shadcn/schema";
import { getComponent, readCatalog, readManifest, resolveInstallTree } from "./providers.mjs";

const detectedFrameworks = [
  ["react-native", "react-native"], ["expo", "react-native"], ["next", "react"],
  ["react", "react"], ["vue", "vue"], ["svelte", "svelte"],
  ["@angular/core", "angular"], ["solid-js", "solid"], ["astro", "astro"],
];

function parseDependency(spec) {
  const separator = spec.indexOf("@", 1);
  return separator < 0 ? [spec, null] : [spec.slice(0, separator), spec.slice(separator + 1)];
}

function dependencyReport(specs, installed) {
  return [...new Set(specs)].filter((spec) => typeof spec === "string").map((spec) => {
    const [name, version] = parseDependency(spec);
    const current = Object.hasOwn(installed, name) ? installed[name] : undefined;
    let status = "missing";
    if (current) {
      if (!version) status = "present";
      else if (!semver.validRange(version) || !semver.validRange(current)) status = "review";
      else status = semver.intersects(version, current) ? "present" : "conflict";
    }
    return { name, required: version, declaredByProject: current, status };
  });
}

function safeRelativePath(path) {
  return typeof path === "string" && path.length > 0 && !posix.isAbsolute(path)
    && !win32.isAbsolute(path) && !/[:\x00-\x1f]/.test(path) && !path.split(/[\\/]/).includes("..");
}

async function loadProject(project) {
  if (!isAbsolute(project.directory) || !existsSync(project.directory)) {
    throw new Error("Provide the absolute path to an existing project directory.");
  }
  const [manifest, catalog] = await Promise.all([
    readManifest(project.directory, "package.json"),
    readCatalog(project.directory),
  ]);
  if (!manifest) throw new Error("No package.json in the target app directory.");
  const packages = { ...manifest.devDependencies, ...manifest.dependencies };
  const detected = detectedFrameworks.find(([name]) => Object.hasOwn(packages, name))?.[1];
  return { packages, catalog, framework: project.framework ?? detected ?? "unknown" };
}

function frameworkCheck(component, framework) {
  if (framework === "unknown" || !component.framework) return "review";
  if (component.framework === framework) return "compatible";
  return framework === "astro" && component.framework === "react" ? "review" : "incompatible";
}

function licenseCheck(component, review) {
  if (review?.status === "rejected") return { ...component.license, status: "rejected", evidence: review.evidence };
  if (review?.status === "approved") return { ...component.license, status: "approved", evidence: review.evidence };
  return component.license;
}

function evaluate(component, project, input, tree) {
  const dependencies = dependencyReport(tree.dependencies ?? [], project.packages);
  const devDependencies = dependencyReport(tree.devDependencies ?? [], project.packages);
  const packages = [...dependencies, ...devDependencies];
  const files = tree.files ?? [];
  const framework = frameworkCheck(component, project.framework);
  const license = licenseCheck(component, input.licenseReview);
  const blockers = [];
  const review = [];
  if (["registry:example", "registry:base", "registry:style", "registry:theme"].includes(component.type)) {
    blockers.push("This registry item is a reference or changes project-wide styling rather than a standalone component.");
  }
  if (framework === "incompatible") blockers.push("Component and target frameworks are incompatible.");
  if (framework === "review") review.push("Confirm that the target can render the component and its dependencies.");
  if (license.status === "rejected") blockers.push("The license review rejected reuse.");
  if (license.status === "declared" || license.status === "unknown") {
    review.push("Verify that upstream licensing permits the intended reuse and supply licenseReview.");
  }
  if (!component.sourceAvailable) review.push("The selected source did not return readable component code.");
  if (files.some((file) => (file.path && !safeRelativePath(file.path))
    || (file.target && !safeRelativePath(file.target.replace(/^~\//, ""))))) {
    blockers.push("The source declares an unsafe or non-relative file path.");
  }
  if (packages.some(({ status }) => status === "conflict")) blockers.push("Declared dependency ranges conflict.");
  if (packages.some(({ status }) => status === "review")) review.push("Check dependency specs that cannot be compared as semver ranges.");

  const requirements = input.requiredFeatures ?? [];
  const metadata = [component.name, component.description].filter(Boolean).join(" ").toLowerCase();
  const featuresMentioned = requirements.filter((feature) => metadata.includes(feature.toLowerCase()));
  const frameworkPoints = framework === "compatible" ? 35 : 0;
  const licensePoints = ["upstream", "approved"].includes(license.status) ? 20 : 0;
  const sourcePoints = component.sourceAvailable ? 20 : 0;
  const dependencyPoints = Math.max(0, 25 - packages.filter(({ status }) => status !== "present").length * 5);
  return {
    source: component.source,
    id: component.id,
    name: component.name,
    framework: { component: component.framework, project: project.framework, status: framework },
    license,
    dependencies,
    devDependencies,
    blockers,
    review,
    score: blockers.length ? null : frameworkPoints + licensePoints + sourcePoints + dependencyPoints,
    scoreBreakdown: { framework: frameworkPoints, license: licensePoints, source: sourcePoints, dependencies: dependencyPoints },
    featuresMentioned,
    requiredFeaturesToVerify: requirements,
    verify: ["Functional behavior", "Keyboard and focus behavior", "Responsive and theme behavior", "Runtime and dependency impact"],
  };
}

export async function evaluateComponent(source, id, input) {
  const project = await loadProject(input);
  const component = await getComponent(source, id, project.catalog);
  const tree = await resolveInstallTree(component, project.catalog);
  return evaluate(component, project, input, tree);
}

export async function prepareInstall(source, id, input) {
  const project = await loadProject(input);
  const component = await getComponent(source, id, project.catalog);
  const tree = await resolveInstallTree(component, project.catalog);
  const evaluation = evaluate(component, project, input, tree);
  const setup = [];
  const registryDependencies = component.registryDependencies ?? [];
  const files = (tree.files ?? []).map(({ path, target, type }) => ({
    sourcePath: path, declaredTarget: target, type,
  }));
  if (!project.catalog.components) {
    setup.push("Initialize shadcn in the target app and review its components.json.");
  } else if (!rawConfigSchema.safeParse(project.catalog.components).success) {
    setup.push("Fix the target app's components.json so it passes shadcn configuration validation.");
  }
  const missingMagic = !Object.hasOwn(project.catalog.configured, "@magicui")
    && (source === "@magicui" || registryDependencies.some((dependency) => dependency.startsWith("@magicui/")));
  if (missingMagic) setup.push('Add "@magicui": "https://magicui.design/r/{name}.json" to components.json registries.');
  if (source === "21st" && !component.slug) setup.push("Resolve the verified author/slug for this numeric 21st item.");
  const envVars = Object.keys(tree.envVars ?? {});
  if (envVars.length) setup.push("Review the environment variables declared by the registry item.");
  const status = evaluation.blockers.length ? "blocked"
    : evaluation.review.length || setup.length ? "review_required" : "ready_for_review";
  const registryCommand = { command: "npx", args: ["-y", "shadcn@4.23.0", "add", component.id], cwd: input.directory };
  const catalogCommand = { command: "npx", args: ["-y", "@21st-dev/cli@1.18.0", "add", component.slug], cwd: input.directory };
  return {
    status,
    evaluation,
    setup,
    files,
    registryDependencies,
    changes: { css: Boolean(tree.css), cssVariables: Boolean(tree.cssVars), environmentVariableNames: envVars },
    preview: source !== "21st" && !evaluation.blockers.length && !setup.length
      ? { ...registryCommand, args: [...registryCommand.args, "--dry-run"] } : undefined,
    install: status === "ready_for_review" ? source === "21st" ? catalogCommand : registryCommand : undefined,
    nextSteps: [
      "Review paths and file collisions in the target app using the installer preview or source diff.",
      "Review transitive registry dependencies and any third-party assets or environment variables.",
      "Run the selected command when implementation is in scope, then adapt to project tokens and run existing checks.",
    ],
  };
}
