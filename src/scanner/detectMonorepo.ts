import type { MonorepoInfo, PackageJsonLike, PackageSummary, ScanContext } from "../types/repoFacts";

function extractPackageJsonWorkspaces(packageJson: PackageJsonLike | null): string[] {
  const workspaces = packageJson?.workspaces;
  if (!workspaces) {
    return [];
  }

  if (Array.isArray(workspaces)) {
    return workspaces;
  }

  return workspaces.packages ?? [];
}

function extractWorkspaceGlobsFromPnpm(content: string): string[] {
  const matches = [...content.matchAll(/-\s*["']?([^"'#\r\n]+)["']?/g)];
  return matches.map((match) => match[1].trim()).filter(Boolean);
}

function collectNestedEntries(relativeFiles: string[], folderName: string): string[] {
  const values = new Set<string>();

  for (const file of relativeFiles) {
    if (!file.startsWith(`${folderName}/`)) {
      continue;
    }

    const parts = file.split("/");
    if (parts.length >= 2) {
      values.add(`${parts[0]}/${parts[1]}`);
    }
  }

  return [...values].sort();
}

function getWorkspaceManager(context: ScanContext, packageJsonGlobs: string[], pnpmGlobs: string[]): string | null {
  const files = new Set(context.relativeFiles);

  if (files.has("pnpm-workspace.yaml") || pnpmGlobs.length > 0) return "pnpm";
  if (packageJsonGlobs.length > 0 && files.has("yarn.lock")) return "yarn";
  if (packageJsonGlobs.length > 0 && files.has("package-lock.json")) return "npm";
  if (packageJsonGlobs.length > 0) return "workspace-config";
  return null;
}

export function detectMonorepo(context: ScanContext): MonorepoInfo {
  const packageJsonGlobs = extractPackageJsonWorkspaces(context.packageJson);
  const pnpmWorkspaceFile = context.fileContentCache.get("pnpm-workspace.yaml") ?? "";
  const pnpmGlobs = pnpmWorkspaceFile ? extractWorkspaceGlobsFromPnpm(pnpmWorkspaceFile) : [];
  const workspaceGlobs = [...new Set([...packageJsonGlobs, ...pnpmGlobs])].sort();
  const detectedApps = collectNestedEntries(context.relativeFiles, "apps");
  const detectedPackages = collectNestedEntries(context.relativeFiles, "packages");
  const detectedServices = collectNestedEntries(context.relativeFiles, "services");
  const detectedLibraries = collectNestedEntries(context.relativeFiles, "libs");
  const monorepoTools = [
    context.relativeFiles.includes("turbo.json") ? "Turborepo" : null,
    context.relativeFiles.includes("nx.json") ? "Nx" : null,
  ].filter((tool): tool is string => tool !== null);
  const workspaceManager = getWorkspaceManager(context, packageJsonGlobs, pnpmGlobs);
  const topLevelStructureSignal =
    detectedApps.length > 0 || detectedPackages.length > 0 || detectedServices.length > 0 || detectedLibraries.length > 0;
  const isMonorepo =
    workspaceGlobs.length > 0 || monorepoTools.length > 0 || topLevelStructureSignal;

  const monorepoNotes: string[] = [];
  if (isMonorepo) {
    monorepoNotes.push("This repository appears to use a multi-package or multi-application layout.");
  }
  if (workspaceManager) {
    monorepoNotes.push(`Likely workspace manager: ${workspaceManager}.`);
  }
  if (detectedApps.length > 0) {
    monorepoNotes.push(`Detected apps: ${detectedApps.join(", ")}.`);
  }
  if (detectedPackages.length > 0) {
    monorepoNotes.push(`Detected packages: ${detectedPackages.join(", ")}.`);
  }
  if (detectedServices.length > 0) {
    monorepoNotes.push(`Detected services: ${detectedServices.join(", ")}.`);
  }
  if (detectedLibraries.length > 0) {
    monorepoNotes.push(`Detected libraries: ${detectedLibraries.join(", ")}.`);
  }

  return {
    isMonorepo,
    workspaceManager,
    workspaceGlobs,
    detectedApps,
    detectedPackages,
    detectedServices,
    detectedLibraries,
    monorepoTools,
    monorepoNotes,
    packageGraph: null,
  };
}

function hasWorkspacePackageManifest(relativeFiles: string[], workspacePath: string): boolean {
  return relativeFiles.some(
    (file) =>
      file === `${workspacePath}/package.json` ||
      file === `${workspacePath}/pyproject.toml` ||
      file === `${workspacePath}/setup.py`,
  );
}

export function buildPackageSummary(context: ScanContext, monorepo: MonorepoInfo): PackageSummary {
  const files = new Set(context.relativeFiles);
  const workspaceEntries = [
    ...monorepo.detectedApps,
    ...monorepo.detectedPackages,
    ...monorepo.detectedServices,
    ...monorepo.detectedLibraries,
  ];

  return {
    hasRootPackageJson: files.has("package.json"),
    hasRootPyprojectToml: files.has("pyproject.toml"),
    hasRequirementsTxt: files.has("requirements.txt"),
    hasSetupPy: files.has("setup.py"),
    hasSetupCfg: files.has("setup.cfg"),
    hasPipfile: files.has("Pipfile"),
    hasPoetryLock: files.has("poetry.lock"),
    hasRootLockfile:
      files.has("package-lock.json") ||
      files.has("pnpm-lock.yaml") ||
      files.has("yarn.lock") ||
      files.has("bun.lock") ||
      files.has("bun.lockb") ||
      files.has("poetry.lock") ||
      files.has("Pipfile.lock"),
    workspacePackageCount: workspaceEntries.filter((entry) => hasWorkspacePackageManifest(context.relativeFiles, entry)).length,
    appCount: monorepo.detectedApps.length,
    packageCount: monorepo.detectedPackages.length,
    serviceCount: monorepo.detectedServices.length,
    libraryCount: monorepo.detectedLibraries.length,
    hasSharedConfigPackage: monorepo.detectedPackages.some((entry) => entry.toLowerCase().includes("config")),
  };
}
