import type { RepoFacts } from "../types/repoFacts";
import { bulletList, formatKeyValueTable, orderedList, section } from "../utils/markdown";

function formatLayerMap(repoFacts: RepoFacts): string[] {
  return repoFacts.architecture.layers.map(
    (layer) => `${layer.name}: ${layer.files.slice(0, 5).join(", ") || "no representative files detected"}`,
  );
}

function formatRoutes(repoFacts: RepoFacts): string[] {
  return repoFacts.architecture.routes.map(
    (route) => `${route.method ?? "unknown"} ${route.path} (${route.source}) in ${route.file}`,
  );
}

function formatEntrypoints(repoFacts: RepoFacts): string[] {
  return repoFacts.architecture.entrypoints.map(
    (entrypoint) => `${entrypoint.file} [${entrypoint.kind}] - ${entrypoint.reason}`,
  );
}

function formatModels(repoFacts: RepoFacts): string[] {
  return repoFacts.architecture.dataModels.map(
    (model) => `${model.name} (${model.source}) in ${model.file}`,
  );
}

function formatEnvUsage(repoFacts: RepoFacts): string[] {
  return repoFacts.architecture.envUsage.map(
    (usage) => `${usage.name} used in ${usage.file} via ${usage.source}`,
  );
}

function formatPackageRelationships(repoFacts: RepoFacts): string[] {
  return repoFacts.architecture.packageRelationships.map(
    (relationship) =>
      `${relationship.sourcePackage} -> ${relationship.targetPackage} (${relationship.importCount} import(s); ${relationship.sourcePath} -> ${relationship.targetPath}; example: ${relationship.file})`,
  );
}

function formatImportantFiles(repoFacts: RepoFacts): string[] {
  return repoFacts.architecture.importantFiles.map(
    (file) => `${file.file} (score: ${file.score}; reasons: ${file.reasons.join(", ")})`,
  );
}

function formatDependencyGraph(repoFacts: RepoFacts): string[] {
  return [
    `Internal edges: ${repoFacts.dependencyGraph.internalEdges.length}`,
    `External packages: ${repoFacts.dependencyGraph.externalPackages.join(", ") || "none"}`,
    `Top internal hubs: ${repoFacts.dependencyGraph.topImportedInternalFiles.map((item) => `${item.file} (${item.count})`).join(", ") || "none"}`,
    `Top external packages: ${repoFacts.dependencyGraph.topImportedExternalPackages.map((item) => `${item.packageName} (${item.count})`).join(", ") || "none"}`,
    ...repoFacts.dependencyGraph.notes,
  ];
}

function formatModuleResolution(repoFacts: RepoFacts): string[] {
  return [
    `Alias config files: ${repoFacts.architecture.moduleResolution.configFiles.join(", ") || "none"}`,
    `Alias patterns: ${repoFacts.architecture.moduleResolution.aliases.map((alias) => `${alias.pattern} -> ${alias.targets.join(", ")} (${alias.source})`).join(" | ") || "none"}`,
    `Base paths: ${repoFacts.architecture.moduleResolution.basePaths.map((item) => `${item.path || "."} (${item.source})`).join(" | ") || "none"}`,
    ...repoFacts.architecture.moduleResolution.notes,
  ];
}

function formatCycles(repoFacts: RepoFacts): string[] {
  return repoFacts.dependencyGraph.possibleCycles.map((cycle) => `${cycle.files.join(" -> ")} | ${cycle.note}`);
}

function formatFanCounts(items: Array<{ file: string; count: number }>): string[] {
  return items.map((item) => `${item.file} (${item.count})`);
}

export function generateArchitectureReport(repoFacts: RepoFacts): string {
  return [
    `# Architecture: ${repoFacts.metadata.projectName}`,
    "",
    section(
      "Architecture Summary",
      formatKeyValueTable([
        ["Project Type", repoFacts.projectType],
        ["Architecture Style", repoFacts.architecture.architectureStyle],
        ["Entrypoints", String(repoFacts.architecture.entrypoints.length)],
        ["Routes", String(repoFacts.architecture.routes.length)],
        ["Layers", String(repoFacts.architecture.layers.length)],
        ["Important Files", String(repoFacts.architecture.importantFiles.length)],
        ["Health Endpoint", repoFacts.hasHealthEndpoint ? repoFacts.detectedHealthRoutes.join(", ") : "Not detected"],
        ["Alias Patterns", String(repoFacts.architecture.moduleResolution.aliases.length)],
      ]),
    ),
    section("Detected Project Style", bulletList(repoFacts.architecture.notes)),
    section(
      "Workspace Structure",
      bulletList([
        `Monorepo: ${repoFacts.monorepo.isMonorepo ? "yes" : "no"}`,
        `Workspace manager: ${repoFacts.monorepo.workspaceManager ?? "not detected"}`,
        `Apps: ${repoFacts.monorepo.detectedApps.join(", ") || "none"}`,
        `Packages: ${repoFacts.monorepo.detectedPackages.join(", ") || "none"}`,
        `Services: ${repoFacts.monorepo.detectedServices.join(", ") || "none"}`,
        `Libraries: ${repoFacts.monorepo.detectedLibraries.join(", ") || "none"}`,
      ]),
    ),
    section("Entrypoints", bulletList(formatEntrypoints(repoFacts))),
    section("Module Resolution", bulletList(formatModuleResolution(repoFacts))),
    section("Layer Map", bulletList(formatLayerMap(repoFacts))),
    section("Routes And API Surface", bulletList(formatRoutes(repoFacts))),
    section("Data Models", bulletList(formatModels(repoFacts))),
    section("Environment Variable Names", bulletList(formatEnvUsage(repoFacts))),
    section("Dependency Graph", bulletList(formatDependencyGraph(repoFacts))),
    section("High Fan-In Files", bulletList(formatFanCounts(repoFacts.dependencyGraph.highFanInFiles))),
    section("High Fan-Out Files", bulletList(formatFanCounts(repoFacts.dependencyGraph.highFanOutFiles))),
    section("Possible Cycles", bulletList(formatCycles(repoFacts))),
    section("Package Relationships", bulletList(formatPackageRelationships(repoFacts))),
    section(
      "Monorepo Package Graph",
      bulletList([
        `Shared packages: ${repoFacts.monorepo.packageGraph?.sharedPackages.map((item) => `${item.packageName} used by ${item.usedBy.join(", ")}`).join(" | ") || "none"}`,
        `Orphan packages: ${repoFacts.monorepo.packageGraph?.orphanPackages.join(", ") || "none"}`,
      ]),
    ),
    section("Important Files", bulletList(formatImportantFiles(repoFacts))),
    section(
      "Architecture Risks",
      bulletList(
        repoFacts.architectureRisks.map(
          (risk) => `${risk.severity.toUpperCase()}: ${risk.title} - ${risk.detail} Fix: ${risk.suggestedFix}`,
        ),
      ),
    ),
    section("Recommended Improvements", orderedList(repoFacts.recommendedNextSteps)),
  ].join("\n");
}
