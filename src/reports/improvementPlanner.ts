import type { ImprovementItem, RepoFacts } from "../types/repoFacts";

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `RR-${String(idCounter).padStart(3, "0")}`;
}

export function buildImprovementItems(repoFacts: RepoFacts): ImprovementItem[] {
  idCounter = 0;
  const items: ImprovementItem[] = [];

  const add = (item: Omit<ImprovementItem, "id">): void => {
    items.push({ id: nextId(), ...item });
  };

  // Health endpoint missing
  if (
    ["backend-api", "full-stack-app"].includes(repoFacts.projectType) &&
    repoFacts.architecture.routes.length > 0 &&
    !repoFacts.hasHealthEndpoint
  ) {
    add({
      title: "Add health endpoint",
      category: "health-check",
      severity: "warning",
      effort: "low",
      impact: "high",
      source: "health endpoint detection",
      problem: "Backend/API routes detected but no health endpoint was found. Deployment checks and monitoring require a health endpoint.",
      recommendedFix: "Add a GET /health (or /status /ready /live) endpoint that returns HTTP 200 and a JSON body such as { status: 'ok' }. Use your framework's routing pattern.",
      acceptanceCriteria: [
        "A health endpoint responds with HTTP 200",
        "The endpoint returns JSON with a status field",
        "The route is reachable from the application root",
      ],
      suggestedFiles: ["src/server.ts", "src/app.ts", "src/index.ts", "src/routes/index.ts"],
      relatedFacts: [`routes: ${repoFacts.architecture.routes.length}`, `projectType: ${repoFacts.projectType}`],
      safeForAgent: true,
    });
  }

  // CI missing
  if (repoFacts.metadata.totalFilesScanned >= 30 && repoFacts.ci.providers.length === 0) {
    add({
      title: "Add CI workflow",
      category: "ci",
      severity: repoFacts.metadata.totalFilesScanned >= 100 ? "warning" : "info",
      effort: "low",
      impact: "high",
      source: "CI detection",
      problem: "No continuous integration workflow was detected. Automated testing and builds improve reliability and contributor confidence.",
      recommendedFix: "Add .github/workflows/ci.yml (or equivalent) that installs dependencies, runs lint/typecheck/build, and runs tests on pull requests and pushes to main.",
      acceptanceCriteria: [
        "CI runs on push to main and on pull requests",
        "CI installs dependencies",
        "CI runs lint/build/test steps",
        "CI passes on the current codebase",
      ],
      suggestedFiles: [".github/workflows/ci.yml"],
      relatedFacts: [`filesScanned: ${repoFacts.metadata.totalFilesScanned}`],
      safeForAgent: true,
    });
  }

  // Missing .env.example
  if (repoFacts.architecture.envUsage.length > 0 && !repoFacts.qualitySignals.hasEnvExample) {
    const envNames = [...new Set(repoFacts.architecture.envUsage.map((u) => u.name))];
    add({
      title: "Add .env.example",
      category: "environment",
      severity: "critical",
      effort: "low",
      impact: "medium",
      source: "env usage detection",
      problem: "Environment variables are used in code, but .env.example is missing. New contributors cannot know which configuration values are required.",
      recommendedFix: "Create .env.example at the repository root. List every required variable name with an empty or placeholder value. Do NOT include real secrets.",
      acceptanceCriteria: [
        ".env.example exists at the repository root",
        "All required env variable names are listed",
        "Values are empty or clearly marked as placeholders",
        "No real secrets are included",
      ],
      suggestedFiles: [".env.example"],
      relatedFacts: [`envVariables: ${envNames.join(", ")}`],
      safeForAgent: true,
    });
  }

  // Dockerfile without .dockerignore
  if (repoFacts.deployment.hasDockerfile && !repoFacts.deployment.hasDockerIgnore) {
    add({
      title: "Add .dockerignore",
      category: "deployment",
      severity: "warning",
      effort: "low",
      impact: "medium",
      source: "deployment detection",
      problem: "A Dockerfile exists but .dockerignore is missing. Build contexts can include node_modules, secrets, or local caches, making images larger and less secure.",
      recommendedFix: "Add .dockerignore that excludes node_modules, .env, .git, build output, and local caches.",
      acceptanceCriteria: [
        ".dockerignore exists",
        "node_modules and local build artifacts are excluded",
        ".env files are excluded",
      ],
      suggestedFiles: [".dockerignore"],
      relatedFacts: ["hasDockerfile: true", "hasDockerIgnore: false"],
      safeForAgent: true,
    });
  }

  // Tests missing
  if (!repoFacts.qualitySignals.hasTests) {
    add({
      title: "Add automated tests",
      category: "testing",
      severity: "warning",
      effort: "medium",
      impact: "high",
      source: "quality signals",
      problem: "No automated tests were detected. Tests reduce regression risk and increase confidence when refactoring or adding features.",
      recommendedFix: "Add at least one smoke test that starts the application (or imports the main module) and asserts it does not throw. Choose a test runner that matches your stack.",
      acceptanceCriteria: [
        "A test file exists in the project",
        "The test can be run with a single command",
        "At least one test passes",
      ],
      suggestedFiles: ["src/__tests__/smoke.spec.ts", "tests/smoke.test.js", "test_main.py"],
      relatedFacts: ["hasTests: false"],
      safeForAgent: true,
    });
  }

  // README weak/missing
  if (!repoFacts.qualitySignals.hasReadme) {
    add({
      title: "Add README.md",
      category: "documentation",
      severity: "warning",
      effort: "low",
      impact: "high",
      source: "quality signals",
      problem: "The repository lacks a README. Onboarding, contribution, and deployment instructions are missing.",
      recommendedFix: "Add a README.md with project purpose, setup steps, build/test commands, and deployment notes. Use README_SUGGESTION.md as a starting draft.",
      acceptanceCriteria: [
        "README.md exists at the repository root",
        "README includes setup instructions",
        "README includes build/test commands",
      ],
      suggestedFiles: ["README.md"],
      relatedFacts: ["hasReadme: false"],
      safeForAgent: true,
    });
  }

  // License missing
  if (!repoFacts.qualitySignals.hasLicense) {
    add({
      title: "Add a license",
      category: "documentation",
      severity: "info",
      effort: "low",
      impact: "low",
      source: "quality signals",
      problem: "No LICENSE file was detected. Without a license, usage rights are unclear.",
      recommendedFix: "Choose an open-source license (e.g., MIT, Apache-2.0) or document the license in package metadata and add a LICENSE file.",
      acceptanceCriteria: [
        "LICENSE file exists or license is declared in package metadata",
        "License text is complete and correct",
      ],
      suggestedFiles: ["LICENSE", "package.json"],
      relatedFacts: ["hasLicense: false"],
      safeForAgent: true,
    });
  }

  // Deployment docs missing
  if (!repoFacts.qualitySignals.hasDeploymentDocs && (repoFacts.deployment.hasDockerfile || repoFacts.deployment.platforms.length > 0)) {
    add({
      title: "Add deployment documentation",
      category: "deployment",
      severity: "info",
      effort: "low",
      impact: "medium",
      source: "deployment detection",
      problem: "Deployment signals exist but no deployment documentation was found. Operators and contributors need guidance.",
      recommendedFix: "Add a deploy section to README.md or create DEPLOYMENT.md with environment variables, build steps, and runtime commands.",
      acceptanceCriteria: [
        "Deployment instructions are documented",
        "Required environment variables are listed",
        "Build and runtime steps are described",
      ],
      suggestedFiles: ["README.md", "DEPLOYMENT.md"],
      relatedFacts: [`hasDockerfile: ${repoFacts.deployment.hasDockerfile}`, `platforms: ${repoFacts.deployment.platforms.join(", ") || "none"}`],
      safeForAgent: true,
    });
  }

  // Monorepo without clear docs
  if (repoFacts.monorepo.isMonorepo && !repoFacts.qualitySignals.hasReadme) {
    add({
      title: "Document monorepo workspace",
      category: "monorepo",
      severity: "info",
      effort: "low",
      impact: "medium",
      source: "monorepo detection",
      problem: "The repository appears to be a monorepo but lacks root documentation. Workspace layout and package responsibilities are unclear.",
      recommendedFix: "Add a root README with a workspace map, package responsibilities, and shared scripts. List each app/package and its purpose.",
      acceptanceCriteria: [
        "Root README explains workspace structure",
        "Each major package/app is listed with its purpose",
        "Shared scripts and commands are documented",
      ],
      suggestedFiles: ["README.md"],
      relatedFacts: [`workspaceManager: ${repoFacts.monorepo.workspaceManager ?? "not detected"}`, `apps: ${repoFacts.monorepo.detectedApps.length}`],
      safeForAgent: true,
    });
  }

  // Unresolved aliases
  if (repoFacts.architecture.moduleResolution.unresolvedInternalImports > 0) {
    add({
      title: "Fix unresolved alias imports",
      category: "architecture",
      severity: "info",
      effort: "medium",
      impact: "medium",
      source: "module resolution",
      problem: `There are ${repoFacts.architecture.moduleResolution.unresolvedInternalImports} unresolved internal imports. These may indicate broken paths, missing alias config, or dynamic imports that the scanner could not resolve.`,
      recommendedFix: "Review tsconfig.json / jsconfig.json / vite.config aliases and ensure they match actual source directories. Check for typos in import paths.",
      acceptanceCriteria: [
        "All alias patterns resolve to existing directories",
        "No broken internal imports remain",
      ],
      suggestedFiles: repoFacts.architecture.moduleResolution.configFiles,
      relatedFacts: [`unresolvedImports: ${repoFacts.architecture.moduleResolution.unresolvedInternalImports}`],
      safeForAgent: true,
    });
  }

  // High fan-out file
  if (repoFacts.dependencyGraph.highFanOutFiles.length > 0) {
    const top = repoFacts.dependencyGraph.highFanOutFiles[0];
    add({
      title: `Review high fan-out file: ${top.file}`,
      category: "architecture",
      severity: "info",
      effort: "high",
      impact: "medium",
      source: "dependency graph",
      problem: `The file ${top.file} imports from ${top.count} other internal files, which may indicate it has too many responsibilities.`,
      recommendedFix: "Consider extracting cohesive groups of imports into separate modules or introducing an intermediate layer. Do not refactor unless behavior is well tested.",
      acceptanceCriteria: [
        "Responsibilities are clearly separated or documented",
        "Tests pass after any refactoring",
      ],
      suggestedFiles: [top.file],
      relatedFacts: [`fanOut: ${top.count}`],
      safeForAgent: false,
    });
  }

  // Database detected but no docs
  const hasDatabaseLayer = repoFacts.architecture.layers.some((l) => l.name === "database");
  const hasSchemaOrMigrationDoc = repoFacts.metadata.importantConfigFiles.some(
    (f) => f.includes("schema") || f.includes("migration"),
  );
  if (hasDatabaseLayer && !hasSchemaOrMigrationDoc) {
    add({
      title: "Add database schema or migration documentation",
      category: "documentation",
      severity: "info",
      effort: "low",
      impact: "medium",
      source: "architecture detection",
      problem: "Database-related files were detected, but no schema or migration documentation was found.",
      recommendedFix: "Document migrations, schema ownership, or data model conventions in README or a dedicated docs/ folder.",
      acceptanceCriteria: [
        "Database conventions are documented",
        "Migration workflow is described",
      ],
      suggestedFiles: ["README.md", "docs/database.md"],
      relatedFacts: ["database layer detected"],
      safeForAgent: true,
    });
  }

  // Hardcoded secrets
  if (repoFacts.securitySignals.possibleHardcodedSecrets.length > 0) {
    add({
      title: "Review possible hardcoded secrets",
      category: "security",
      severity: "critical",
      effort: "low",
      impact: "high",
      source: "security signals",
      problem: `Potential hardcoded secret patterns were detected in ${repoFacts.securitySignals.possibleHardcodedSecrets.length} location(s).`,
      recommendedFix: "Replace inline secrets with environment variables. Rotate any exposed credentials. Add the affected files to .gitignore only if they should not be tracked.",
      acceptanceCriteria: [
        "No secrets are hardcoded in source files",
        "Required env variables are listed in .env.example",
        "Exposed credentials are rotated",
      ],
      suggestedFiles: repoFacts.securitySignals.possibleHardcodedSecrets.slice(0, 3).map((s) => s.file),
      relatedFacts: [`secretFindings: ${repoFacts.securitySignals.possibleHardcodedSecrets.length}`],
      safeForAgent: true,
    });
  }

  // Env not ignored in gitignore
  if (repoFacts.securitySignals.envRiskWarning) {
    add({
      title: "Protect .env files in .gitignore",
      category: "security",
      severity: "critical",
      effort: "low",
      impact: "high",
      source: "security signals",
      problem: ".env files exist but are not clearly protected by .gitignore. Secrets may have been committed.",
      recommendedFix: "Add .env and .env.* to .gitignore immediately. Verify no secrets are in git history.",
      acceptanceCriteria: [
        ".env and .env.* are in .gitignore",
        "No .env files with real values are tracked by git",
      ],
      suggestedFiles: [".gitignore"],
      relatedFacts: ["envRiskWarning: true"],
      safeForAgent: true,
    });
  }

  // No lockfile
  if (!repoFacts.qualitySignals.hasRootLockfile && repoFacts.packageSummary.hasRootPackageJson) {
    add({
      title: "Add a lockfile",
      category: "package-quality",
      severity: "info",
      effort: "low",
      impact: "medium",
      source: "package summary",
      problem: "No root lockfile was detected. Dependency versions may drift between installs and environments.",
      recommendedFix: "Run your package manager's install command to generate a lockfile (package-lock.json, yarn.lock, pnpm-lock.yaml) and commit it.",
      acceptanceCriteria: [
        "Lockfile exists at the repository root",
        "Lockfile is committed to version control",
      ],
      suggestedFiles: ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"],
      relatedFacts: ["hasRootLockfile: false"],
      safeForAgent: true,
    });
  }

  // Lint script missing
  if (!repoFacts.qualitySignals.hasLintScript && repoFacts.packageSummary.hasRootPackageJson) {
    add({
      title: "Add lint script",
      category: "developer-experience",
      severity: "info",
      effort: "low",
      impact: "medium",
      source: "quality signals",
      problem: "No lint script was detected. Consistent code style reduces review friction and catches simple errors.",
      recommendedFix: "Add a lint script to package.json (e.g., eslint . or prettier --check .) and run it in CI.",
      acceptanceCriteria: [
        "Lint script exists in package.json",
        "Lint passes on the current codebase",
      ],
      suggestedFiles: ["package.json"],
      relatedFacts: ["hasLintScript: false"],
      safeForAgent: true,
    });
  }

  // Scan truncated
  if (repoFacts.scanSafety.truncated) {
    add({
      title: "Increase scan limits or narrow patterns",
      category: "developer-experience",
      severity: "info",
      effort: "low",
      impact: "low",
      source: "scan safety",
      problem: `The scan was truncated at ${repoFacts.scanSafety.maxFiles} files. Some files were not analyzed, which may hide issues or affect report completeness.`,
      recommendedFix: "Increase maxFiles in reporadar.config.json or use include/exclude patterns to focus on the most relevant directories.",
      acceptanceCriteria: [
        "Scan completes without truncation for the intended scope",
      ],
      suggestedFiles: ["reporadar.config.json"],
      relatedFacts: [`maxFiles: ${repoFacts.scanSafety.maxFiles}`, `truncated: true`],
      safeForAgent: true,
    });
  }

  return items.sort((a, b) => {
    const sevRank = { critical: 0, warning: 1, info: 2 };
    const diff = sevRank[a.severity] - sevRank[b.severity];
    if (diff !== 0) return diff;
    return b.impact.localeCompare(a.impact) || a.effort.localeCompare(b.effort);
  });
}
