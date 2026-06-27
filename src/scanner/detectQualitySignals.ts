import type { QualitySignals, ScanContext } from "../types/repoFacts";

function hasTestFolderOrFile(relativeFiles: string[]): boolean {
  return relativeFiles.some((file) => {
    const lower = file.toLowerCase();
    return (
      lower.includes("/__tests__/") ||
      lower.startsWith("__tests__/") ||
      lower.includes(".test.") ||
      lower.includes(".spec.") ||
      lower.startsWith("tests/")
    );
  });
}

export function detectQualitySignals(context: ScanContext): QualitySignals {
  const relativeFiles = new Set(context.relativeFiles);
  const scripts = context.packageJson?.scripts ?? {};
  const hasPythonBuildConfig =
    relativeFiles.has("pyproject.toml") || relativeFiles.has("setup.py") || relativeFiles.has("setup.cfg");
  const hasCiWorkflow = context.relativeFiles.some((file) => file.startsWith(".github/workflows/"));
  const hasWorkspaceConfig =
    relativeFiles.has("pnpm-workspace.yaml") ||
    relativeFiles.has("turbo.json") ||
    relativeFiles.has("nx.json") ||
    Boolean(context.packageJson?.workspaces);
  const hasRootLockfile =
    relativeFiles.has("package-lock.json") ||
    relativeFiles.has("pnpm-lock.yaml") ||
    relativeFiles.has("yarn.lock") ||
    relativeFiles.has("bun.lock") ||
    relativeFiles.has("bun.lockb") ||
    relativeFiles.has("poetry.lock") ||
    relativeFiles.has("Pipfile.lock");

  return {
    hasReadme: context.relativeFiles.some((file) => file.toLowerCase() === "readme.md"),
    hasLicense: context.relativeFiles.some((file) => file.toLowerCase().startsWith("license")),
    hasEnvExample: context.relativeFiles.some((file) => file.toLowerCase() === ".env.example"),
    hasTests: hasTestFolderOrFile(context.relativeFiles),
    hasTypeScriptConfig: relativeFiles.has("tsconfig.json"),
    hasLintScript: Boolean(scripts.lint),
    hasBuildScript: Boolean(scripts.build) || hasPythonBuildConfig,
    hasStartScript:
      Boolean(scripts.start) ||
      context.relativeFiles.some((file) => file === "main.py" || file === "app.py" || file === "manage.py"),
    hasDevScript: Boolean(scripts.dev),
    hasDockerfile: relativeFiles.has("Dockerfile"),
    hasDeploymentDocs: context.relativeFiles.some((file) => {
      const lower = file.toLowerCase();
      return (
        lower.includes("deploy") ||
        lower === "render.yaml" ||
        lower === "render.yml" ||
        lower === "vercel.json" ||
        lower === "netlify.toml" ||
        lower === "railway.json" ||
        lower === "railway.toml" ||
        lower.startsWith(".github/workflows/") ||
        lower === "docker-compose.yml" ||
        lower === "docker-compose.yaml" ||
        lower.endsWith("nginx.conf")
      );
    }),
    hasCiWorkflow,
    hasWorkspaceConfig,
    hasRootLockfile,
  };
}
