import type { RepoFacts } from "../types/repoFacts";
import { bulletList, formatKeyValueTable, orderedList, section } from "../utils/markdown";
import { explainHealthScore, topPenaltySummaries } from "../utils/scoring";

export function generateProjectReport(repoFacts: RepoFacts): string {
  const executiveSummary = [
    `${repoFacts.metadata.projectName} was classified as a ${repoFacts.projectType}.`,
    `RepoRadar AI detected ${repoFacts.detectedFrameworks.join(", ") || "no major frameworks"} across ${repoFacts.metadata.totalFilesScanned} scanned files.`,
    `The current deterministic health score is ${repoFacts.healthScore}/${repoFacts.healthDetails.maxScore}.`,
  ];
  if (repoFacts.monorepo.isMonorepo) {
    executiveSummary.push(`This repository appears to be a monorepo managed with ${repoFacts.monorepo.workspaceManager ?? "an inferred workspace setup"}.`);
  }
  if (repoFacts.ecosystems.python.detected) {
    executiveSummary.push(`Python ecosystem signals were detected${repoFacts.ecosystems.python.frameworks.length > 0 ? `, including ${repoFacts.ecosystems.python.frameworks.join(", ")}` : ""}.`);
  }
  if (repoFacts.architecture.moduleResolution.aliases.length > 0) {
    executiveSummary.push(`Alias-aware resolution detected ${repoFacts.architecture.moduleResolution.aliases.length} alias pattern(s) across ${repoFacts.architecture.moduleResolution.configFiles.length} config file(s).`);
  }

  return [
    `# Project Report: ${repoFacts.metadata.projectName}`,
    "",
    section("Executive Summary", bulletList(executiveSummary)),
    section(
      "Project Snapshot",
      formatKeyValueTable([
        ["Project Name", repoFacts.metadata.projectName],
        ["Project Type", repoFacts.projectType],
        ["Package Manager", repoFacts.packageManager ?? "Not detected"],
        ["Files Scanned", String(repoFacts.metadata.totalFilesScanned)],
        ["Skipped Files", String(repoFacts.scanSafety.skippedFiles)],
        ["Skipped Folders", String(repoFacts.scanSafety.skippedFolders)],
        ["Health Score", `${repoFacts.healthScore}/${repoFacts.healthDetails.maxScore}`],
        ["Monorepo", repoFacts.monorepo.isMonorepo ? "Yes" : "No"],
      ]),
    ),
    section(
      "Config Summary",
      bulletList([
        `Config detected: ${repoFacts.config.configDetected ? "yes" : "no"}`,
        `Config path: ${repoFacts.config.configPath ?? "not present"}`,
        `Output directory: ${repoFacts.config.outputDir}`,
        `Include patterns: ${repoFacts.config.appliedIncludePatterns.join(", ") || "default full-repo scan"}`,
        `Exclude patterns: ${repoFacts.config.appliedExcludePatterns.join(", ") || "default ignored folders only"}`,
        `Config warnings: ${repoFacts.config.configWarnings.join(" | ") || "none"}`,
      ]),
    ),
    section(
      "Scan Safety Summary",
      bulletList([
        `Max files: ${repoFacts.scanSafety.maxFiles}`,
        `Max file size: ${repoFacts.scanSafety.maxFileSizeKb} KB`,
        `Skipped files: ${repoFacts.scanSafety.skippedFiles}`,
        `Skipped folders: ${repoFacts.scanSafety.skippedFolders}`,
        `Truncated: ${repoFacts.scanSafety.truncated ? "yes" : "no"}`,
        ...repoFacts.scanSafety.skippedReasons.map((item) => `${item.reason}: ${item.count}`),
      ]),
    ),
    section("Detected Stack", bulletList(repoFacts.detectedFrameworks)),
    section(
      "Framework Coverage Notes",
      bulletList([
        `Detected frameworks and tools: ${repoFacts.detectedFrameworks.join(", ") || "none"}`,
        `Python frameworks: ${repoFacts.ecosystems.python.frameworks.join(", ") || "none"}`,
        `Architecture style: ${repoFacts.architecture.architectureStyle}`,
      ]),
    ),
    section(
      "Module Resolution",
      bulletList([
        `Alias config files: ${repoFacts.architecture.moduleResolution.configFiles.join(", ") || "none"}`,
        `Alias patterns: ${repoFacts.architecture.moduleResolution.aliases.map((alias) => `${alias.pattern} -> ${alias.targets.join(", ")} (${alias.source})`).join(" | ") || "none"}`,
        `Base paths: ${repoFacts.architecture.moduleResolution.basePaths.map((item) => `${item.path || "."} (${item.source})`).join(" | ") || "none"}`,
        ...repoFacts.architecture.moduleResolution.notes,
      ]),
    ),
    section(
      "Monorepo Intelligence",
      bulletList([
        `Monorepo: ${repoFacts.monorepo.isMonorepo ? "yes" : "no"}`,
        `Workspace manager: ${repoFacts.monorepo.workspaceManager ?? "not detected"}`,
        `Apps: ${repoFacts.monorepo.detectedApps.join(", ") || "none"}`,
        `Packages: ${repoFacts.monorepo.detectedPackages.join(", ") || "none"}`,
        `Services: ${repoFacts.monorepo.detectedServices.join(", ") || "none"}`,
        `Libraries: ${repoFacts.monorepo.detectedLibraries.join(", ") || "none"}`,
      ]),
    ),
    section(
      "Dependency Graph Summary",
      bulletList([
        `Internal edges: ${repoFacts.dependencyGraph.internalEdges.length}`,
        `External packages: ${repoFacts.dependencyGraph.externalPackages.length}`,
        `Top external packages: ${repoFacts.dependencyGraph.topImportedExternalPackages.map((item) => `${item.packageName} (${item.count})`).join(", ") || "none"}`,
        `High fan-in files: ${repoFacts.dependencyGraph.highFanInFiles.map((item) => `${item.file} (${item.count})`).join(", ") || "none"}`,
        `High fan-out files: ${repoFacts.dependencyGraph.highFanOutFiles.map((item) => `${item.file} (${item.count})`).join(", ") || "none"}`,
        ...repoFacts.dependencyGraph.notes,
      ]),
    ),
    section(
      "Route And Data Coverage",
      bulletList([
        `Route sources: ${[...new Set(repoFacts.architecture.routes.map((route) => route.source))].join(", ") || "none"}`,
        `Detected routes: ${repoFacts.architecture.routes.length}`,
        `Data model sources: ${[...new Set(repoFacts.architecture.dataModels.map((model) => model.source))].join(", ") || "none"}`,
        `Detected data models: ${repoFacts.architecture.dataModels.length}`,
      ]),
    ),
    section(
      "Architecture Risks",
      bulletList(
        repoFacts.architectureRisks.map(
          (risk) => `${risk.severity.toUpperCase()}: ${risk.title} - ${risk.detail} Fix: ${risk.suggestedFix}`,
        ),
      ),
    ),
    section(
      "Deployment Readiness",
      bulletList([
        `Deployment tools: ${repoFacts.deployment.tools.join(", ") || "none detected"}`,
        `Deployment platforms: ${repoFacts.deployment.platforms.join(", ") || "none detected"}`,
        `Deployment docs present: ${repoFacts.qualitySignals.hasDeploymentDocs ? "yes" : "no"}`,
        `Health endpoint detected: ${repoFacts.hasHealthEndpoint ? repoFacts.detectedHealthRoutes.join(", ") : "no"}`,
        ...repoFacts.deployment.notes,
      ]),
    ),
    section("Health Score Breakdown", bulletList(explainHealthScore(repoFacts))),
    section("Top Reasons For Lost Points", bulletList(topPenaltySummaries(repoFacts))),
    section(
      "Actionable Outputs Generated",
      bulletList([
        `FIX_PLAN.md — prioritized improvement plan (${repoFacts.improvementItems.length} items)`,
        `QUICK_WINS.md — low-effort, high-impact fixes`,
        `GITHUB_ISSUES.md — copy-paste ready GitHub issues`,
        `AGENT_FIX_PROMPT.md — prompt for AI coding agents to apply fixes safely`,
      ]),
    ),
    section("Key Issues", bulletList(repoFacts.issues)),
    section("Recommended Next Steps", orderedList(repoFacts.recommendedNextSteps)),
  ].join("\n");
}
