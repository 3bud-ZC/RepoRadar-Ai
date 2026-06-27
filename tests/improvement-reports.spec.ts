import fs from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateAgentFixPrompt } from "../src/reports/generateAgentFixPrompt";
import { generateFixPlan } from "../src/reports/generateFixPlan";
import { generateGitHubIssues } from "../src/reports/generateGitHubIssues";
import { generateQuickWins } from "../src/reports/generateQuickWins";
import type { ImprovementItem, RepoFacts } from "../src/types/repoFacts";

function makeFacts(improvements: ImprovementItem[] = []): RepoFacts {
  return {
    metadata: {
      scannedAt: new Date().toISOString(),
      projectName: "test-project",
      rootPath: "/test",
      outputPath: "/test/.reporadar",
      totalFilesScanned: 30,
      mainFolders: ["src"],
      importantConfigFiles: [],
      generatedFiles: [],
    },
    config: {
      configDetected: false,
      configPath: null,
      configWarnings: [],
      appliedIncludePatterns: [],
      appliedExcludePatterns: [],
      outputDir: ".reporadar",
      maxFiles: 5000,
      maxFileSizeKb: 512,
      reports: {
        project: true,
        architecture: true,
        techStack: true,
        security: true,
        readme: true,
        agentPrompt: true,
        linkedin: true,
        portfolio: true,
        fixPlan: true,
        quickWins: true,
        githubIssues: true,
        agentFixPrompt: true,
      },
    },
    scanSafety: { maxFiles: 5000, maxFileSizeKb: 512, skippedFiles: 0, skippedFolders: 0, skippedReasons: [], truncated: false },
    detectedLanguages: [{ name: "TypeScript", fileCount: 10 }],
    detectedFrameworks: ["Express"],
    packageManager: "npm",
    projectType: "backend-api",
    monorepo: { isMonorepo: false, workspaceManager: null, workspaceGlobs: [], detectedApps: [], detectedPackages: [], detectedServices: [], detectedLibraries: [], monorepoTools: [], monorepoNotes: [], packageGraph: null },
    ecosystems: { primary: ["typescript"], python: { detected: false, packageFiles: [], dependencyFiles: [], frameworks: [], testingTools: [], usesSrcLayout: false, hasPytestConfig: false } },
    deployment: { tools: [], configFiles: [], platforms: [], hasDockerfile: false, hasDockerCompose: false, hasDockerIgnore: false, hasNginxConfig: false, hasPm2Config: false, notes: [] },
    ci: { providers: [], workflowFiles: [] },
    packageSummary: { hasRootPackageJson: true, hasRootPyprojectToml: false, hasRequirementsTxt: false, hasSetupPy: false, hasSetupCfg: false, hasPipfile: false, hasPoetryLock: false, hasRootLockfile: true, workspacePackageCount: 0, appCount: 0, packageCount: 0, serviceCount: 0, libraryCount: 0, hasSharedConfigPackage: false },
    architecture: { entrypoints: [], routes: [], imports: [], moduleResolution: { aliases: [], basePaths: [], configFiles: [], resolvedInternalImports: 0, unresolvedInternalImports: 0, aliasResolvedImports: 0, relativeResolvedImports: 0, baseUrlResolvedImports: 0, notes: [] }, layers: [], dataModels: [], envUsage: [], packageRelationships: [], importantFiles: [], architectureStyle: "backend-api", notes: [] },
    dependencyGraph: { internalEdges: [], externalPackages: [], topImportedExternalPackages: [], topImportedInternalFiles: [], highFanInFiles: [], highFanOutFiles: [], possibleCycles: [], notes: [] },
    architectureRisks: [],
    hasHealthEndpoint: false,
    detectedHealthRoutes: [],
    qualitySignals: { hasReadme: true, hasLicense: true, hasEnvExample: true, hasTests: true, hasTypeScriptConfig: true, hasLintScript: true, hasBuildScript: true, hasStartScript: true, hasDevScript: true, hasDockerfile: false, hasDeploymentDocs: true, hasCiWorkflow: true, hasWorkspaceConfig: false, hasRootLockfile: true },
    securitySignals: { envFilesDetected: [], envIgnoredInGitignore: true, envRiskWarning: false, possibleHardcodedSecrets: [] },
    healthScore: 91,
    healthBreakdown: { documentation: 15, structure: 18, security: 18, testing: 15, deploymentReadiness: 15, aiReadiness: 10 },
    healthDetails: { maxScore: 100, categoryMaxScores: { documentation: 20, structure: 20, security: 20, testing: 15, deploymentReadiness: 15, aiReadiness: 10 }, penalties: [] },
    issues: [],
    recommendedNextSteps: [],
    improvementItems: improvements,
  };
}

describe("improvement reports", () => {
  it("FIX_PLAN.md includes executive summary and priorities", () => {
    const facts = makeFacts([
      { id: "RR-001", title: "Add tests", category: "testing", severity: "warning", effort: "medium", impact: "high", source: "quality", problem: "No tests", recommendedFix: "Add tests", acceptanceCriteria: ["Tests pass"], suggestedFiles: ["src"], relatedFacts: [], safeForAgent: true },
    ]);
    const md = generateFixPlan(facts);
    expect(md).toContain("Fix Plan: test-project");
    expect(md).toContain("Executive Summary");
    expect(md).toContain("Priority Order");
    expect(md).toContain("RR-001");
    expect(md).toContain("Safe for agent");
  });

  it("FIX_PLAN.md handles empty items gracefully", () => {
    const facts = makeFacts([]);
    const md = generateFixPlan(facts);
    expect(md).toContain("Fix Plan: test-project");
    expect(md).toContain("Status");
  });

  it("QUICK_WINS.md includes low-effort items with time estimates", () => {
    const facts = makeFacts([
      { id: "RR-002", title: "Add .dockerignore", category: "deployment", severity: "warning", effort: "low", impact: "medium", source: "deployment", problem: "Missing", recommendedFix: "Add file", acceptanceCriteria: ["Exists"], suggestedFiles: [".dockerignore"], relatedFacts: [], safeForAgent: true },
    ]);
    const md = generateQuickWins(facts);
    expect(md).toContain("Quick Wins: test-project");
    expect(md).toContain("RR-002");
    expect(md).toContain("Estimated time");
  });

  it("QUICK_WINS.md handles no quick wins", () => {
    const facts = makeFacts([]);
    const md = generateQuickWins(facts);
    expect(md).toContain("No quick wins were identified");
  });

  it("GITHUB_ISSUES.md has copy-paste ready format", () => {
    const facts = makeFacts([
      { id: "RR-003", title: "Add health endpoint", category: "health-check", severity: "critical", effort: "low", impact: "high", source: "health", problem: "Missing", recommendedFix: "Add endpoint", acceptanceCriteria: ["Returns 200", "Returns JSON"], suggestedFiles: ["src/server.ts"], relatedFacts: [], safeForAgent: true },
    ]);
    const md = generateGitHubIssues(facts);
    expect(md).toContain("GitHub Issues Export: test-project");
    expect(md).toContain("## Issue 1: Add health endpoint");
    expect(md).toContain("**Labels:**");
    expect(md).toContain("repo-radar");
    expect(md).toContain("### Problem");
    expect(md).toContain("### Recommended Fix");
    expect(md).toContain("### Acceptance Criteria");
    expect(md).toContain("- [ ]");
    expect(md).toContain("Generated by RepoRadar AI");
  });

  it("AGENT_FIX_PROMPT.md includes safety constraints", () => {
    const facts = makeFacts([
      { id: "RR-004", title: "Add README", category: "documentation", severity: "info", effort: "low", impact: "medium", source: "docs", problem: "Missing", recommendedFix: "Add README", acceptanceCriteria: ["Exists"], suggestedFiles: ["README.md"], relatedFacts: [], safeForAgent: true },
    ]);
    const md = generateAgentFixPrompt(facts);
    expect(md).toContain("AI Agent Fix Prompt: test-project");
    expect(md).toContain("scanned project");
    expect(md).toContain("Strict Constraints");
    expect(md).toContain("Do NOT expose secrets");
    expect(md).toContain("Do NOT overwrite user work");
    expect(md).toContain("Expected Final Response");
  });

  it("new reports are generated by default on scan", () => {
    const outputDir = path.resolve("examples/sample-project-output");
    const expectedFiles = ["FIX_PLAN.md", "QUICK_WINS.md", "GITHUB_ISSUES.md", "AGENT_FIX_PROMPT.md"];
    for (const file of expectedFiles) {
      expect(fs.existsSync(path.join(outputDir, file))).toBe(true);
    }
  });
});
