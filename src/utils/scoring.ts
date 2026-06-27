import type {
  HealthBreakdown,
  HealthDetails,
  RepoFacts,
  ScorePenalty,
} from "../types/repoFacts";

type ScoreCategory = keyof HealthBreakdown;

const CATEGORY_MAX_SCORES: HealthBreakdown = {
  documentation: 20,
  structure: 20,
  security: 20,
  testing: 15,
  deploymentReadiness: 15,
  aiReadiness: 10,
};

function clampScore(value: number, maxScore = 100): number {
  return Math.max(0, Math.min(maxScore, Math.round(value)));
}

function addPenalty(
  penalties: ScorePenalty[],
  category: ScoreCategory,
  pointsLost: number,
  reason: string,
  recommendedFix: string,
): void {
  if (pointsLost <= 0) {
    return;
  }

  penalties.push({
    category,
    pointsLost,
    reason,
    recommendedFix,
  });
}

export function buildHealthModel(
  repoFacts: Omit<RepoFacts, "issues" | "recommendedNextSteps">,
  issues: string[],
): { breakdown: HealthBreakdown; details: HealthDetails; totalScore: number } {
  const { qualitySignals, securitySignals, detectedFrameworks: frameworks, monorepo, deployment, ci, packageSummary, architecture, scanSafety, hasHealthEndpoint, config } = repoFacts;
  const hasPrimaryProjectConfig =
    qualitySignals.hasTypeScriptConfig || packageSummary.hasRootPyprojectToml || packageSummary.hasSetupPy || packageSummary.hasSetupCfg;
  const penalties: ScorePenalty[] = [];

  addPenalty(
    penalties,
    "documentation",
    qualitySignals.hasReadme ? 0 : 8,
    "README.md is missing.",
    "Add a README with setup, usage, and architecture notes.",
  );
  addPenalty(penalties, "documentation", qualitySignals.hasLicense ? 0 : 4, "License file is missing.", "Add a LICENSE file or document licensing clearly.");
  addPenalty(
    penalties,
    "documentation",
    qualitySignals.hasDeploymentDocs ? 0 : 4,
    "Deployment documentation was not detected.",
    "Add deployment or release instructions such as deploy.md, render.yaml, or vercel.json.",
  );
  addPenalty(
    penalties,
    "documentation",
    qualitySignals.hasEnvExample ? 0 : 4,
    ".env.example was not found.",
    "Add .env.example with placeholder values for required configuration.",
  );

  addPenalty(
    penalties,
    "structure",
    hasPrimaryProjectConfig ? 0 : 5,
    "No primary project configuration file was detected.",
    "Add tsconfig.json, pyproject.toml, setup.py, or setup.cfg so tooling can understand the project structure.",
  );
  addPenalty(
    penalties,
    "structure",
    qualitySignals.hasLintScript ? 0 : 4,
    "No lint script was detected.",
    "Add a lint script so quality checks are repeatable.",
  );
  addPenalty(
    penalties,
    "structure",
    qualitySignals.hasBuildScript ? 0 : 4,
    "No build script was detected.",
    "Add a build script for reliable packaging or deployment.",
  );
  addPenalty(
    penalties,
    "structure",
    qualitySignals.hasDevScript ? 0 : 3,
    "No dev script was detected.",
    "Add a dev script for local development workflows.",
  );
  addPenalty(
    penalties,
    "structure",
    qualitySignals.hasStartScript ? 0 : 2,
    "No start script was detected.",
    "Add a start script when the project has a runnable runtime entrypoint.",
  );
  addPenalty(
    penalties,
    "structure",
    frameworks.length > 0 ? 0 : 2,
    "No major framework or tooling hints were detected.",
    "Add clearer dependency, config, or entrypoint metadata so the scanner can classify the repo accurately.",
  );
  addPenalty(
    penalties,
    "structure",
    architecture.entrypoints.length > 0 ? 0 : 3,
    "No likely entrypoints were detected.",
    "Add or document clearer entrypoints through common filenames or package metadata.",
  );

  addPenalty(
    penalties,
    "security",
    securitySignals.envIgnoredInGitignore ? 0 : 4,
    ".env files are not clearly protected by .gitignore.",
    "Add .env or .env* ignore rules to .gitignore.",
  );
  addPenalty(
    penalties,
    "security",
    qualitySignals.hasEnvExample ? 0 : 2,
    "Safe environment variable documentation is missing.",
    "Add .env.example with placeholder values only.",
  );
  addPenalty(
    penalties,
    "security",
    securitySignals.envFilesDetected.length === 0 ? 0 : 2,
    "Runtime env files exist and require handling discipline.",
    "Keep env files ignored and document required variables through .env.example.",
  );
  addPenalty(
    penalties,
    "security",
    securitySignals.envRiskWarning ? 6 : 0,
    ".env files exist without matching protection in .gitignore.",
    "Ignore .env files immediately and verify no secrets were committed.",
  );
  addPenalty(
    penalties,
    "security",
    Math.min(8, securitySignals.possibleHardcodedSecrets.length * 2),
    "Potential hardcoded secret patterns were detected.",
    "Review flagged files, replace inline secrets with env variables, and rotate exposed credentials if needed.",
  );
  addPenalty(
    penalties,
    "security",
    deployment.hasDockerfile && !deployment.hasDockerIgnore ? 2 : 0,
    "Dockerfile exists without .dockerignore protection.",
    "Add .dockerignore to avoid leaking large, noisy, or sensitive local files into build context.",
  );

  addPenalty(
    penalties,
    "testing",
    qualitySignals.hasTests ? 0 : 10,
    "No automated tests were detected.",
    "Add unit or smoke tests for critical flows.",
  );
  addPenalty(
    penalties,
    "testing",
    frameworks.some((framework) => ["Vitest", "Jest", "Playwright", "Cypress", "Pytest"].includes(framework)) ? 0 : 5,
    "No dedicated testing tool was detected.",
    "Add Vitest, Jest, Playwright, Cypress, or Pytest depending on project shape.",
  );
  addPenalty(
    penalties,
    "testing",
    ci.providers.length > 0 ? 0 : 2,
    "No CI workflow was detected.",
    "Add CI automation such as GitHub Actions to run tests consistently.",
  );

  addPenalty(
    penalties,
    "deploymentReadiness",
    deployment.hasDockerfile || deployment.platforms.length > 0 ? 0 : 7,
    "No clear deployment target or Docker packaging was detected.",
    "Add a Dockerfile or platform config such as vercel.json, netlify.toml, render.yaml, or railway.json.",
  );
  addPenalty(
    penalties,
    "deploymentReadiness",
    qualitySignals.hasBuildScript ? 0 : 4,
    "Build automation is missing.",
    "Add a build script so release artifacts can be produced consistently.",
  );
  addPenalty(
    penalties,
    "deploymentReadiness",
    qualitySignals.hasStartScript ? 0 : 2,
    "Runtime start command is missing.",
    "Add a start script or document the runtime entrypoint clearly.",
  );
  addPenalty(
    penalties,
    "deploymentReadiness",
    qualitySignals.hasDeploymentDocs ? 0 : 2,
    "Deployment docs or config were not detected.",
    "Add deployment guidance or CI/CD configuration.",
  );
  addPenalty(
    penalties,
    "deploymentReadiness",
    ci.providers.length > 0 ? 0 : 2,
    "No CI/CD workflow was detected.",
    "Add CI workflows for build, test, or release automation.",
  );
  addPenalty(
    penalties,
    "deploymentReadiness",
    ["backend-api", "full-stack-app"].includes(repoFacts.projectType) && architecture.routes.length > 0 && !hasHealthEndpoint ? 3 : 0,
    "Backend routes exist without a detected health endpoint.",
    "Add a simple /health, /status, /ready, or /live endpoint for deployment checks.",
  );

  addPenalty(
    penalties,
    "aiReadiness",
    qualitySignals.hasReadme ? 0 : 3,
    "AI agents lack README context.",
    "Add a README that explains project purpose and setup.",
  );
  addPenalty(
    penalties,
    "aiReadiness",
    hasPrimaryProjectConfig ? 0 : 2,
    "Project typing/config context is limited.",
    "Add or improve configuration files that define source layout and compiler/runtime expectations.",
  );
  addPenalty(
    penalties,
    "aiReadiness",
    frameworks.length > 0 ? 0 : 2,
    "The stack is hard to infer from repo evidence.",
    "Add clearer dependencies and configuration so tools can classify the repository.",
  );
  addPenalty(
    penalties,
    "aiReadiness",
    qualitySignals.hasBuildScript ? 0 : 1,
    "No build script is available for agent-driven validation.",
    "Add a build script agents can run safely.",
  );
  addPenalty(
    penalties,
    "aiReadiness",
    architecture.entrypoints.length > 0 ? 0 : 1,
    "Architecture entrypoints are unclear.",
    "Expose runtime entrypoints through common file names, scripts, or package metadata.",
  );
  addPenalty(
    penalties,
    "aiReadiness",
    architecture.routes.length > 0 || !["backend-api", "full-stack-app", "frontend-app"].includes(repoFacts.projectType) ? 0 : 1,
    "No route or navigation surface was detected.",
    "Make route definitions easier to locate through conventional files or central router configuration.",
  );
  addPenalty(
    penalties,
    "aiReadiness",
    Math.min(2, issues.length),
    "Open repo issues reduce autonomous task confidence.",
    "Address the highest-priority issues before adding AI workflows.",
  );
  addPenalty(
    penalties,
    "aiReadiness",
    scanSafety.truncated ? 2 : 0,
    "The scan was truncated before every file could be evaluated.",
    "Increase maxFiles or narrow include/exclude patterns in reporadar.config.json.",
  );
  addPenalty(
    penalties,
    "structure",
    config.configWarnings.length > 0 ? 2 : 0,
    "RepoRadar config warnings forced some settings back to defaults.",
    "Fix reporadar.config.json validation warnings so the intended scan behavior is applied.",
  );

  if (monorepo.isMonorepo) {
    addPenalty(
      penalties,
      "structure",
      qualitySignals.hasWorkspaceConfig ? 0 : 6,
      "Monorepo structure was detected without a clear workspace config.",
      "Add npm, pnpm, or yarn workspace config so the repo layout is explicit.",
    );
    addPenalty(
      penalties,
      "structure",
      packageSummary.workspacePackageCount > 0 ? 0 : 4,
      "Detected apps or packages do not have clear package manifests.",
      "Add package.json or pyproject.toml files inside workspace entries.",
    );
    addPenalty(
      penalties,
      "structure",
      packageSummary.hasSharedConfigPackage ? 0 : 2,
      "No shared config package was detected in the monorepo.",
      "Consider centralizing shared config such as lint, tsconfig, or tooling presets.",
    );
    addPenalty(
      penalties,
      "documentation",
      qualitySignals.hasReadme ? 0 : 2,
      "Monorepo root documentation is missing.",
      "Add a root README that describes workspace layout and cross-package scripts.",
    );
  }

  addPenalty(
    penalties,
    "structure",
    qualitySignals.hasRootLockfile ? 0 : 3,
    "No root lockfile was detected.",
    "Commit a lockfile at the repository root for reproducible installs.",
  );

  const categories = Object.keys(CATEGORY_MAX_SCORES) as ScoreCategory[];
  const breakdown = categories.reduce<HealthBreakdown>((result, category) => {
    const lostPoints = penalties
      .filter((penalty) => penalty.category === category)
      .reduce((sum, penalty) => sum + penalty.pointsLost, 0);
    result[category] = clampScore(CATEGORY_MAX_SCORES[category] - lostPoints, CATEGORY_MAX_SCORES[category]);
    return result;
  }, {
    documentation: 0,
    structure: 0,
    security: 0,
    testing: 0,
    deploymentReadiness: 0,
    aiReadiness: 0,
  });

  const totalScore = clampScore(
    breakdown.documentation +
      breakdown.structure +
      breakdown.security +
      breakdown.testing +
      breakdown.deploymentReadiness +
      breakdown.aiReadiness,
  );

  return {
    breakdown,
    details: {
      maxScore: 100,
      categoryMaxScores: CATEGORY_MAX_SCORES,
      penalties,
    },
    totalScore,
  };
}

export function explainHealthScore(repoFacts: RepoFacts): string[] {
  return [
    `Documentation: ${repoFacts.healthBreakdown.documentation}/${repoFacts.healthDetails.categoryMaxScores.documentation}`,
    `Structure: ${repoFacts.healthBreakdown.structure}/${repoFacts.healthDetails.categoryMaxScores.structure}`,
    `Security: ${repoFacts.healthBreakdown.security}/${repoFacts.healthDetails.categoryMaxScores.security}`,
    `Testing: ${repoFacts.healthBreakdown.testing}/${repoFacts.healthDetails.categoryMaxScores.testing}`,
    `Deployment readiness: ${repoFacts.healthBreakdown.deploymentReadiness}/${repoFacts.healthDetails.categoryMaxScores.deploymentReadiness}`,
    `AI-agent readiness: ${repoFacts.healthBreakdown.aiReadiness}/${repoFacts.healthDetails.categoryMaxScores.aiReadiness}`,
  ];
}

export function topPenaltySummaries(repoFacts: RepoFacts, limit = 3): string[] {
  return repoFacts.healthDetails.penalties
    .slice()
    .sort((left, right) => right.pointsLost - left.pointsLost || left.reason.localeCompare(right.reason))
    .slice(0, limit)
    .map((penalty) => `${penalty.reason} (-${penalty.pointsLost})`);
}
