import type { ArchitectureRisk, RepoFacts, ResolvedReportSelection, ScanContext } from "../types/repoFacts";
import { detectFrameworks, detectLanguages, detectPackageManager } from "./detectTechStack";
import { detectProjectType } from "./detectProjectType";
import { detectQualitySignals } from "./detectQualitySignals";
import { detectSecuritySignals } from "./detectSecuritySignals";
import { buildPackageSummary, detectMonorepo } from "./detectMonorepo";
import { detectCi, detectDeployment } from "./detectDeploymentSignals";
import { detectEcosystems } from "./detectEcosystems";
import {
  buildMonorepoPackageGraph,
  detectArchitecture,
  detectDependencyGraph,
  detectHealthEndpoints,
} from "./detectArchitecture";
import { buildHealthModel } from "../utils/scoring";
import { buildImprovementItems } from "../reports/improvementPlanner";

function getGeneratedReportFiles(reportSelection: ResolvedReportSelection): string[] {
  const generatedFiles = ["repo-facts.json"];

  if (reportSelection.project) generatedFiles.push("PROJECT_REPORT.md");
  if (reportSelection.architecture) generatedFiles.push("ARCHITECTURE.md");
  if (reportSelection.techStack) generatedFiles.push("TECH_STACK.md");
  if (reportSelection.security) generatedFiles.push("SECURITY_NOTES.md");
  if (reportSelection.readme) generatedFiles.push("README_SUGGESTION.md");
  if (reportSelection.agentPrompt) generatedFiles.push("AI_AGENT_PROMPT.md");
  if (reportSelection.linkedin) generatedFiles.push("LINKEDIN_POST.md");
  if (reportSelection.portfolio) generatedFiles.push("PORTFOLIO_CASE_STUDY.md");
  if (reportSelection.fixPlan) generatedFiles.push("FIX_PLAN.md");
  if (reportSelection.quickWins) generatedFiles.push("QUICK_WINS.md");
  if (reportSelection.githubIssues) generatedFiles.push("GITHUB_ISSUES.md");
  if (reportSelection.agentFixPrompt) generatedFiles.push("AGENT_FIX_PROMPT.md");

  return generatedFiles;
}

function buildArchitectureRisks(repoFacts: Omit<RepoFacts, "issues" | "recommendedNextSteps">): ArchitectureRisk[] {
  const risks: ArchitectureRisk[] = [];
  const addRisk = (risk: ArchitectureRisk): void => {
    if (!risks.some((item) => item.title === risk.title && item.detail === risk.detail)) {
      risks.push(risk);
    }
  };

  if (repoFacts.architecture.routes.length >= 5 && !repoFacts.qualitySignals.hasTests) {
    addRisk({
      severity: "warning",
      title: "Large route surface without tests",
      detail: `Detected ${repoFacts.architecture.routes.length} routes or route hints, but no tests were found.`,
      suggestedFix: "Add smoke or integration tests around the primary route surface.",
    });
  }

  if (repoFacts.architecture.envUsage.length > 0 && !repoFacts.qualitySignals.hasEnvExample) {
    addRisk({
      severity: "critical",
      title: "Runtime config is undocumented",
      detail: "Environment variable names are used in code, but .env.example is missing.",
      suggestedFix: "Add a .env.example file with placeholder values for every required variable.",
    });
  }

  if (repoFacts.deployment.hasDockerfile && !repoFacts.deployment.hasDockerIgnore) {
    addRisk({
      severity: "warning",
      title: "Docker build context may be noisy",
      detail: "A Dockerfile was detected without a matching .dockerignore file.",
      suggestedFix: "Add .dockerignore to exclude node_modules, build output, secrets, and local caches from Docker builds.",
    });
  }

  if (repoFacts.monorepo.isMonorepo && !repoFacts.qualitySignals.hasWorkspaceConfig) {
    addRisk({
      severity: "warning",
      title: "Monorepo layout lacks explicit workspace config",
      detail: "The repository looks like a monorepo, but no clear workspace configuration was detected.",
      suggestedFix: "Add npm, pnpm, or yarn workspace config so tooling and contributors can resolve package boundaries reliably.",
    });
  }

  if (["backend-api", "full-stack-app"].includes(repoFacts.projectType) && !repoFacts.hasHealthEndpoint) {
    addRisk({
      severity: "warning",
      title: "Backend surface has no health endpoint hint",
      detail: "API or backend routes were detected, but no common health endpoint route was found.",
      suggestedFix: "Add a lightweight /health, /status, /ready, or /live endpoint and document it for deployment checks.",
    });
  }

  const hasDatabaseLayer = repoFacts.architecture.layers.some((layer) => layer.name === "database");
  const hasSchemaOrMigrationDoc = repoFacts.metadata.importantConfigFiles.some((file) => file.includes("schema") || file.includes("migration"));
  if (hasDatabaseLayer && !hasSchemaOrMigrationDoc) {
    addRisk({
      severity: "info",
      title: "Database layer lacks clear schema documentation",
      detail: "Database-related files were detected, but no obvious schema or migration documentation signal was found.",
      suggestedFix: "Document migrations, schema ownership, or data model conventions in README or dedicated docs.",
    });
  }

  if (repoFacts.architecture.importantFiles.length >= 8 && !repoFacts.qualitySignals.hasReadme) {
    addRisk({
      severity: "warning",
      title: "Important project surface is underdocumented",
      detail: "Many important files were detected, but the repository has no root README.",
      suggestedFix: "Add a README that explains architecture, setup, and the role of the major files.",
    });
  }

  if (repoFacts.metadata.totalFilesScanned >= 50 && repoFacts.ci.providers.length === 0) {
    addRisk({
      severity: "info",
      title: "Larger project without CI",
      detail: `Detected ${repoFacts.metadata.totalFilesScanned} scanned files, but no CI workflow was found.`,
      suggestedFix: "Add CI to run tests, lint, and build checks for repeatable validation.",
    });
  }

  if (repoFacts.architecture.packageRelationships.length > 0 && !repoFacts.qualitySignals.hasReadme) {
    addRisk({
      severity: "info",
      title: "Package relationships lack root documentation",
      detail: "Cross-package imports were detected, but the root repository documentation is missing.",
      suggestedFix: "Document the package graph and workspace responsibilities in the root README.",
    });
  }

  if (repoFacts.scanSafety.truncated) {
    addRisk({
      severity: "warning",
      title: "Scan results were truncated",
      detail: `The scan hit the configured maxFiles limit of ${repoFacts.scanSafety.maxFiles}.`,
      suggestedFix: "Raise maxFiles in reporadar.config.json or narrow include/exclude patterns for large repositories.",
    });
  }

  return risks.sort((left, right) => {
    const severityRank = { critical: 0, warning: 1, info: 2 };
    return severityRank[left.severity] - severityRank[right.severity] || left.title.localeCompare(right.title);
  });
}

function buildIssues(repoFacts: Omit<RepoFacts, "issues" | "recommendedNextSteps">): string[] {
  const issues: string[] = [];
  const {
    qualitySignals,
    securitySignals,
    detectedFrameworks,
    detectedLanguages,
    projectType,
    monorepo,
    ecosystems,
    deployment,
    packageSummary,
    architecture,
    scanSafety,
    hasHealthEndpoint,
    config,
  } = repoFacts;

  if (!qualitySignals.hasReadme) issues.push("Missing README.md reduces onboarding quality.");
  if (!qualitySignals.hasTests) issues.push("No tests detected.");
  if (!qualitySignals.hasLintScript && packageSummary.hasRootPackageJson) issues.push("No lint script found in package.json.");
  if (!qualitySignals.hasBuildScript) {
    issues.push(
      packageSummary.hasRootPackageJson
        ? "No build script found in package.json."
        : "No build or packaging configuration was detected.",
    );
  }
  if (!qualitySignals.hasRootLockfile) issues.push("No root lockfile detected for dependency reproducibility.");
  if (securitySignals.envRiskWarning) issues.push(".env files exist but are not ignored by .gitignore.");
  if (securitySignals.possibleHardcodedSecrets.length > 0) issues.push("Potential hardcoded secret patterns detected.");
  if (detectedFrameworks.length === 0) issues.push("No major frameworks or tooling detected.");
  if (detectedLanguages.length === 0) issues.push("No supported languages detected by the MVP scanner.");
  if (projectType === "unknown") issues.push("Project type could not be confidently inferred.");
  if (architecture.entrypoints.length === 0) issues.push("No likely entrypoints were detected.");
  if (architecture.routes.length === 0 && ["backend-api", "full-stack-app", "frontend-app"].includes(projectType)) {
    issues.push("No route or route-hint surface was detected.");
  }
  if (architecture.envUsage.length > 0 && !qualitySignals.hasEnvExample) issues.push("Environment variables are used in code but .env.example is missing.");
  if (monorepo.isMonorepo && !qualitySignals.hasWorkspaceConfig) issues.push("Monorepo-like structure detected without a clear workspace config.");
  if (monorepo.isMonorepo && packageSummary.workspacePackageCount === 0) issues.push("Monorepo structure was detected, but per-workspace package manifests were not found.");
  if (ecosystems.python.detected && ecosystems.python.frameworks.length === 0 && projectType === "unknown") {
    issues.push("Python files were detected, but the scanner could not infer the Python project shape confidently.");
  }
  if (deployment.tools.length === 0 && deployment.platforms.length === 0) {
    issues.push("No deployment or CI signals were detected.");
  }
  if (deployment.hasDockerfile && !deployment.hasDockerIgnore) {
    issues.push("Dockerfile detected without .dockerignore.");
  }
  if (["backend-api", "full-stack-app"].includes(projectType) && architecture.routes.length > 0 && !hasHealthEndpoint) {
    issues.push("Backend or API routes were detected, but no health endpoint hint was found.");
  }
  if (scanSafety.truncated) {
    issues.push(`Scan reached the maxFiles limit (${scanSafety.maxFiles}) and may be incomplete.`);
  }
  if (config.configWarnings.length > 0) {
    issues.push("RepoRadar config warnings were detected; some settings fell back to defaults.");
  }

  return [...new Set(issues)];
}

function buildRecommendedNextSteps(repoFacts: Omit<RepoFacts, "issues" | "recommendedNextSteps">, issues: string[]): string[] {
  const nextSteps = new Set<string>();
  const {
    qualitySignals,
    securitySignals,
    projectType,
    monorepo,
    ecosystems,
    deployment,
    packageSummary,
    architecture,
    hasHealthEndpoint,
    scanSafety,
    architectureRisks,
    config,
  } = repoFacts;

  if (!qualitySignals.hasReadme) nextSteps.add("Add or improve README.md with setup, architecture, and usage notes.");
  if (!qualitySignals.hasTests) nextSteps.add("Add smoke tests or unit tests to increase confidence in future scans.");
  if (!qualitySignals.hasEnvExample) nextSteps.add("Add .env.example to document required environment variables safely.");
  if (architecture.entrypoints.length === 0) nextSteps.add("Add clearer entrypoints or package metadata so the runtime surface is easier to infer.");
  if (architecture.routes.length === 0 && ["backend-api", "full-stack-app", "frontend-app"].includes(projectType)) {
    nextSteps.add("Document or centralize route definitions so the API or navigation surface is easier to map.");
  }
  if (architecture.envUsage.length > 0 && !qualitySignals.hasEnvExample) {
    nextSteps.add("Add .env.example entries for the detected environment variable names.");
  }
  if (!qualitySignals.hasRootLockfile) nextSteps.add("Commit a root lockfile to make dependency installs reproducible.");
  if (securitySignals.envRiskWarning) nextSteps.add("Update .gitignore to ignore .env files immediately.");
  if (securitySignals.possibleHardcodedSecrets.length > 0) nextSteps.add("Review flagged files for secrets and rotate any exposed credentials.");
  if (projectType === "unknown") nextSteps.add("Add clearer scripts, docs, or config files so project type becomes easier to infer.");
  if (monorepo.isMonorepo && !qualitySignals.hasWorkspaceConfig) nextSteps.add("Add or fix workspace configuration so the monorepo structure is explicit.");
  if (monorepo.isMonorepo && packageSummary.workspacePackageCount === 0) nextSteps.add("Add package manifests inside detected apps, packages, or services.");
  if (ecosystems.python.detected && ecosystems.python.testingTools.length === 0) nextSteps.add("Add pytest configuration or Python tests to improve confidence in Python repositories.");
  if (deployment.tools.length === 0 && deployment.platforms.length === 0) nextSteps.add("Add deployment config, CI workflows, or deployment docs to improve release readiness.");
  if (deployment.hasDockerfile && !deployment.hasDockerIgnore) nextSteps.add("Add .dockerignore so Docker builds exclude local dependencies, secrets, and generated files.");
  if (["backend-api", "full-stack-app"].includes(projectType) && architecture.routes.length > 0 && !hasHealthEndpoint) {
    nextSteps.add("Add a health endpoint such as /health or /status for deployment and uptime checks.");
  }
  if (scanSafety.truncated) {
    nextSteps.add("Raise maxFiles or tighten include/exclude patterns in reporadar.config.json for larger repositories.");
  }
  if (config.configWarnings.length > 0) {
    nextSteps.add("Fix reporadar.config.json warnings so the intended scan settings apply cleanly.");
  }
  for (const risk of architectureRisks) {
    nextSteps.add(risk.suggestedFix);
  }
  if (issues.length === 0) nextSteps.add("Expand RepoRadar outputs with richer heuristics and optional local AI summarization later.");

  return [...nextSteps];
}

export function buildRepoFacts(context: ScanContext): RepoFacts {
  const monorepo = detectMonorepo(context);
  const ecosystems = detectEcosystems(context);
  const deployment = detectDeployment(context);
  const ci = detectCi(context);
  const packageSummary = buildPackageSummary(context, monorepo);
  const detectedLanguages = detectLanguages(context);
  const detectedFrameworks = detectFrameworks(context);
  const packageManager = detectPackageManager(context);
  const projectType = detectProjectType(context, detectedFrameworks);
  const architecture = detectArchitecture(context, {
    detectedFrameworks,
    projectType,
    monorepo,
    packageSummary,
  });
  const dependencyGraph = detectDependencyGraph(architecture.imports);
  const { hasHealthEndpoint, detectedHealthRoutes } = detectHealthEndpoints(architecture.routes);
  const enrichedMonorepo = {
    ...monorepo,
    packageGraph: buildMonorepoPackageGraph(context, architecture.packageRelationships),
  };
  const qualitySignals = detectQualitySignals(context);
  const securitySignals = detectSecuritySignals(context);

  const baseFacts = {
    metadata: {
      scannedAt: new Date().toISOString(),
      projectName: context.projectName,
      rootPath: context.rootPath,
      outputPath: context.outputPath,
      totalFilesScanned: context.relativeFiles.length,
      mainFolders: context.mainFolders,
      importantConfigFiles: context.importantConfigFiles,
      generatedFiles: getGeneratedReportFiles(context.config.reports),
    },
    config: context.config,
    scanSafety: context.scanSafety,
    detectedLanguages,
    detectedFrameworks,
    packageManager,
    projectType,
    monorepo: enrichedMonorepo,
    ecosystems,
    deployment,
    ci,
    packageSummary,
    architecture,
    dependencyGraph,
    architectureRisks: [] as ArchitectureRisk[],
    hasHealthEndpoint,
    detectedHealthRoutes,
    qualitySignals,
    securitySignals,
    healthScore: 0,
    healthBreakdown: {
      documentation: 0,
      structure: 0,
      security: 0,
      testing: 0,
      deploymentReadiness: 0,
      aiReadiness: 0,
    },
    improvementItems: [],
    healthDetails: {
      maxScore: 100,
      categoryMaxScores: {
        documentation: 20,
        structure: 20,
        security: 20,
        testing: 15,
        deploymentReadiness: 15,
        aiReadiness: 10,
      },
      penalties: [],
    },
  };

  const architectureRisks = buildArchitectureRisks(baseFacts);
  const factsWithRisks = {
    ...baseFacts,
    architectureRisks,
  };
  const issues = buildIssues(factsWithRisks);
  const healthModel = buildHealthModel(factsWithRisks, issues);
  const recommendedNextSteps = buildRecommendedNextSteps(factsWithRisks, issues);

  const factsWithIssues = {
    ...factsWithRisks,
    healthBreakdown: healthModel.breakdown,
    healthDetails: healthModel.details,
    healthScore: healthModel.totalScore,
    issues,
    recommendedNextSteps,
  };

  const improvementItems = buildImprovementItems(factsWithIssues);

  return {
    ...factsWithIssues,
    improvementItems,
  };
}
