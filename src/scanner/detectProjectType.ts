import type { PackageJsonLike, ProjectType, ScanContext } from "../types/repoFacts";

function dependencyNames(packageJson: PackageJsonLike | null): Set<string> {
  return new Set([
    ...Object.keys(packageJson?.dependencies ?? {}),
    ...Object.keys(packageJson?.devDependencies ?? {}),
  ]);
}

export function detectProjectType(context: ScanContext, frameworks: string[]): ProjectType {
  const deps = dependencyNames(context.packageJson);
  const scripts = context.packageJson?.scripts ?? {};
  const frontendFrameworks = ["React", "Vite", "Next.js", "Vue", "Nuxt", "Angular", "Svelte", "SvelteKit", "Astro", "Remix", "SolidJS", "Preact"];
  const backendFrameworks = ["Express", "Fastify", "Koa", "NestJS", "Hono", "FastAPI", "Flask", "Django"];
  const fullStackFrameworks = ["Next.js", "Nuxt", "SvelteKit", "Remix"];
  const cliFrameworks = ["Typer", "Click"];

  const hasFrontend =
    frameworks.some((framework) => frontendFrameworks.includes(framework)) ||
    context.relativeFiles.some(
      (file) =>
        file.startsWith("src/") &&
        (file.endsWith(".tsx") || file.endsWith(".jsx") || file.endsWith(".vue") || file.endsWith(".svelte")),
    );
  const hasBackend =
    frameworks.some((framework) => backendFrameworks.includes(framework)) ||
    deps.has("fastify") ||
    deps.has("koa") ||
    deps.has("@nestjs/core") ||
    context.relativeFiles.some((file) => file.startsWith("api/") || file.startsWith("server/") || file.endsWith("urls.py"));
  const hasCliSignal =
    Boolean(context.packageJson?.bin) ||
    Object.keys(scripts).some((name) => name.includes("cli")) ||
    deps.has("commander") ||
    deps.has("yargs") ||
    frameworks.some((framework) => cliFrameworks.includes(framework));
  const hasPythonLibrarySignal =
    (context.relativeFiles.includes("pyproject.toml") ||
      context.relativeFiles.includes("setup.py") ||
      context.relativeFiles.includes("setup.cfg")) &&
    !hasBackend &&
    !hasFrontend &&
    !hasCliSignal;
  const hasLibrarySignal =
    Boolean(scripts.build) &&
    !Boolean(scripts.start) &&
    !Boolean(scripts.dev) &&
    !hasBackend &&
    !hasFrontend;

  if (frameworks.some((framework) => fullStackFrameworks.includes(framework))) return "full-stack-app";
  if (hasFrontend && hasBackend) return "full-stack-app";
  if (hasFrontend) return "frontend-app";
  if (hasBackend) return "backend-api";
  if (hasCliSignal) return "cli-tool";
  if (hasPythonLibrarySignal) return "library-package";
  if (hasLibrarySignal) return "library-package";

  return "unknown";
}
