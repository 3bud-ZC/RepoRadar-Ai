import type { RepoFacts } from "../types/repoFacts";
import { bulletList, orderedList, section } from "../utils/markdown";

export function generateAiAgentPrompt(repoFacts: RepoFacts): string {
  const routeSummary = repoFacts.architecture.routes.map(
    (route) => `${route.method ?? "unknown"} ${route.path} (${route.source})`,
  );
  const layerSummary = repoFacts.architecture.layers.map(
    (layer) => `${layer.name}: ${layer.files.slice(0, 4).join(", ") || "none"}`,
  );
  const modelSummary = repoFacts.architecture.dataModels.map(
    (model) => `${model.name} (${model.source})`,
  );
  const envSummary = repoFacts.architecture.envUsage.map((usage) => usage.name);
  const dependencySummary = [
    `Internal edges: ${repoFacts.dependencyGraph.internalEdges.length}`,
    `External packages: ${repoFacts.dependencyGraph.topImportedExternalPackages.map((item) => `${item.packageName} (${item.count})`).join(", ") || "none"}`,
    `High fan-in files: ${repoFacts.dependencyGraph.highFanInFiles.map((item) => `${item.file} (${item.count})`).join(", ") || "none"}`,
    `High fan-out files: ${repoFacts.dependencyGraph.highFanOutFiles.map((item) => `${item.file} (${item.count})`).join(", ") || "none"}`,
  ];
  const aliasSummary = [
    `Alias config files: ${repoFacts.architecture.moduleResolution.configFiles.join(", ") || "none"}`,
    `Alias patterns: ${repoFacts.architecture.moduleResolution.aliases.map((alias) => `${alias.pattern} -> ${alias.targets.join(", ")}`).join(" | ") || "none"}`,
    `Base paths: ${repoFacts.architecture.moduleResolution.basePaths.map((item) => `${item.path || "."} (${item.source})`).join(" | ") || "none"}`,
  ];
  const riskSummary = repoFacts.architectureRisks.map(
    (risk) => `${risk.severity.toUpperCase()}: ${risk.title} - ${risk.suggestedFix}`,
  );

  return [
    `# AI Agent Prompt: ${repoFacts.metadata.projectName}`,
    "",
    "> **Note:** This prompt provides general project context for continuing development. For a focused fix-oriented prompt, see `AGENT_FIX_PROMPT.md`.",
    "",
    "Use this deterministic project intelligence before making changes.",
    "",
    section(
      "Project Context",
      bulletList([
        `Project type: ${repoFacts.projectType}`,
        `Languages: ${repoFacts.detectedLanguages.map((item) => item.name).join(", ") || "unknown"}`,
        `Frameworks and tools: ${repoFacts.detectedFrameworks.join(", ") || "unknown"}`,
        `Package manager: ${repoFacts.packageManager ?? "unknown"}`,
        `Monorepo: ${repoFacts.monorepo.isMonorepo ? "yes" : "no"}`,
        `Workspace manager: ${repoFacts.monorepo.workspaceManager ?? "unknown"}`,
        `Python detected: ${repoFacts.ecosystems.python.detected ? "yes" : "no"}`,
        `Architecture style: ${repoFacts.architecture.architectureStyle}`,
        `Config output directory: ${repoFacts.config.outputDir}`,
        `Health endpoint: ${repoFacts.hasHealthEndpoint ? repoFacts.detectedHealthRoutes.join(", ") : "not detected"}`,
        `Health score: ${repoFacts.healthScore}/${repoFacts.healthDetails.maxScore}`,
      ]),
    ),
    section("Entrypoints", bulletList(repoFacts.architecture.entrypoints.map((entrypoint) => `${entrypoint.file} - ${entrypoint.reason}`))),
    section("Routes", bulletList(routeSummary)),
    section("Layers", bulletList(layerSummary)),
    section("Data Models", bulletList(modelSummary)),
    section("Environment Variable Names", bulletList([...new Set(envSummary)])),
    section("Module Resolution", bulletList(aliasSummary)),
    section("Dependency Graph Summary", bulletList(dependencySummary)),
    section("Architecture Risks", bulletList(riskSummary)),
    section("Current Issues", bulletList(repoFacts.issues)),
    section("Next Recommended Tasks", orderedList(repoFacts.recommendedNextSteps)),
    section(
      "Config Constraints",
      bulletList([
        `Include patterns: ${repoFacts.config.appliedIncludePatterns.join(", ") || "default full-repo scan"}`,
        `Exclude patterns: ${repoFacts.config.appliedExcludePatterns.join(", ") || "default ignored folders only"}`,
        `Max files: ${repoFacts.scanSafety.maxFiles}`,
        `Max file size KB: ${repoFacts.scanSafety.maxFileSizeKb}`,
        `Config warnings: ${repoFacts.config.configWarnings.join(" | ") || "none"}`,
      ]),
    ),
    section(
      "Safe Constraints",
      bulletList([
        "Maintain exactly one status file named `STATUS.md` in the project root.",
        "Do not expose secret values from env files or inline credentials.",
        "Run tests before reporting completion.",
        "Update README when behavior changes.",
        "Respect the existing structure before proposing large rewrites.",
        "Use detected scripts and config files as the primary source of truth.",
      ]),
    ),
  ].join("\n");
}
