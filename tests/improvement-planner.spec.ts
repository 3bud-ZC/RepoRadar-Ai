import { describe, expect, it } from "vitest";
import { buildImprovementItems } from "../src/reports/improvementPlanner";
import type { RepoFacts } from "../src/types/repoFacts";

function makeBaseRepoFacts(overrides: Partial<RepoFacts> = {}): RepoFacts {
  const base: RepoFacts = {
    metadata: {
      scannedAt: new Date().toISOString(),
      projectName: "test-project",
      rootPath: "/test",
      outputPath: "/test/.reporadar",
      totalFilesScanned: 50,
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
    scanSafety: {
      maxFiles: 5000,
      maxFileSizeKb: 512,
      skippedFiles: 0,
      skippedFolders: 0,
      skippedReasons: [],
      truncated: false,
    },
    detectedLanguages: [{ name: "TypeScript", fileCount: 10 }],
    detectedFrameworks: ["Express", "React"],
    packageManager: "npm",
    projectType: "full-stack-app",
    monorepo: {
      isMonorepo: false,
      workspaceManager: null,
      workspaceGlobs: [],
      detectedApps: [],
      detectedPackages: [],
      detectedServices: [],
      detectedLibraries: [],
      monorepoTools: [],
      monorepoNotes: [],
      packageGraph: null,
    },
    ecosystems: { primary: ["typescript"], python: { detected: false, packageFiles: [], dependencyFiles: [], frameworks: [], testingTools: [], usesSrcLayout: false, hasPytestConfig: false } },
    deployment: { tools: [], configFiles: [], platforms: [], hasDockerfile: false, hasDockerCompose: false, hasDockerIgnore: false, hasNginxConfig: false, hasPm2Config: false, notes: [] },
    ci: { providers: [], workflowFiles: [] },
    packageSummary: { hasRootPackageJson: true, hasRootPyprojectToml: false, hasRequirementsTxt: false, hasSetupPy: false, hasSetupCfg: false, hasPipfile: false, hasPoetryLock: false, hasRootLockfile: true, workspacePackageCount: 0, appCount: 0, packageCount: 0, serviceCount: 0, libraryCount: 0, hasSharedConfigPackage: false },
    architecture: {
      entrypoints: [],
      routes: [],
      imports: [],
      moduleResolution: { aliases: [], basePaths: [], configFiles: [], resolvedInternalImports: 0, unresolvedInternalImports: 0, aliasResolvedImports: 0, relativeResolvedImports: 0, baseUrlResolvedImports: 0, notes: [] },
      layers: [],
      dataModels: [],
      envUsage: [],
      packageRelationships: [],
      importantFiles: [],
      architectureStyle: "unknown",
      notes: [],
    },
    dependencyGraph: { internalEdges: [], externalPackages: [], topImportedExternalPackages: [], topImportedInternalFiles: [], highFanInFiles: [], highFanOutFiles: [], possibleCycles: [], notes: [] },
    architectureRisks: [],
    hasHealthEndpoint: false,
    detectedHealthRoutes: [],
    qualitySignals: { hasReadme: false, hasLicense: false, hasEnvExample: false, hasTests: false, hasTypeScriptConfig: false, hasLintScript: false, hasBuildScript: false, hasStartScript: false, hasDevScript: false, hasDockerfile: false, hasDeploymentDocs: false, hasCiWorkflow: false, hasWorkspaceConfig: false, hasRootLockfile: true },
    securitySignals: { envFilesDetected: [], envIgnoredInGitignore: true, envRiskWarning: false, possibleHardcodedSecrets: [] },
    healthScore: 50,
    healthBreakdown: { documentation: 10, structure: 10, security: 10, testing: 5, deploymentReadiness: 5, aiReadiness: 5 },
    healthDetails: { maxScore: 100, categoryMaxScores: { documentation: 20, structure: 20, security: 20, testing: 15, deploymentReadiness: 15, aiReadiness: 10 }, penalties: [] },
    issues: [],
    recommendedNextSteps: [],
    improvementItems: [],
    ...overrides,
  };
  return base;
}

describe("improvement planner", () => {
  it("creates a health-check item when backend routes exist without health endpoint", () => {
    const facts = makeBaseRepoFacts({
      projectType: "backend-api",
      architecture: {
        ...makeBaseRepoFacts().architecture,
        routes: [{ method: "GET", path: "/users", file: "src/routes.ts", source: "Express", confidence: 0.9 }],
      },
      hasHealthEndpoint: false,
    });
    const items = buildImprovementItems(facts);
    const healthItem = items.find((i) => i.category === "health-check");
    expect(healthItem).toBeDefined();
    expect(healthItem?.severity).toBe("warning");
    expect(healthItem?.safeForAgent).toBe(true);
  });

  it("creates a CI item for larger projects without CI", () => {
    const facts = makeBaseRepoFacts({
      metadata: { ...makeBaseRepoFacts().metadata, totalFilesScanned: 100 },
      ci: { providers: [], workflowFiles: [] },
    });
    const items = buildImprovementItems(facts);
    const ciItem = items.find((i) => i.category === "ci");
    expect(ciItem).toBeDefined();
    expect(ciItem?.severity).toBe("warning");
  });

  it("creates an environment item when env usage exists without .env.example", () => {
    const facts = makeBaseRepoFacts({
      architecture: {
        ...makeBaseRepoFacts().architecture,
        envUsage: [{ name: "DATABASE_URL", file: "src/db.ts", source: "process.env" }],
      },
      qualitySignals: { ...makeBaseRepoFacts().qualitySignals, hasEnvExample: false },
    });
    const items = buildImprovementItems(facts);
    const envItem = items.find((i) => i.category === "environment");
    expect(envItem).toBeDefined();
    expect(envItem?.severity).toBe("critical");
    expect(envItem?.safeForAgent).toBe(true);
    expect(envItem?.acceptanceCriteria.length).toBeGreaterThan(0);
  });

  it("creates a deployment item for Dockerfile without .dockerignore", () => {
    const facts = makeBaseRepoFacts({
      deployment: { ...makeBaseRepoFacts().deployment, hasDockerfile: true, hasDockerIgnore: false },
    });
    const items = buildImprovementItems(facts);
    const dockerItem = items.find((i) => i.title.includes(".dockerignore"));
    expect(dockerItem).toBeDefined();
    expect(dockerItem?.category).toBe("deployment");
  });

  it("creates a testing item when no tests are detected", () => {
    const facts = makeBaseRepoFacts({
      qualitySignals: { ...makeBaseRepoFacts().qualitySignals, hasTests: false },
    });
    const items = buildImprovementItems(facts);
    const testItem = items.find((i) => i.category === "testing");
    expect(testItem).toBeDefined();
    expect(testItem?.severity).toBe("warning");
  });

  it("sorts critical before warning before info", () => {
    const facts = makeBaseRepoFacts({
      architecture: {
        ...makeBaseRepoFacts().architecture,
        envUsage: [{ name: "API_KEY", file: "src/api.ts", source: "process.env" }],
      },
      qualitySignals: { ...makeBaseRepoFacts().qualitySignals, hasEnvExample: false, hasTests: false },
      metadata: { ...makeBaseRepoFacts().metadata, totalFilesScanned: 150 },
      ci: { providers: [], workflowFiles: [] },
    });
    const items = buildImprovementItems(facts);
    expect(items.length).toBeGreaterThan(0);
    const severities = items.map((i) => i.severity);
    const firstWarning = severities.indexOf("warning");
    const firstInfo = severities.indexOf("info");
    const lastCritical = severities.lastIndexOf("critical");

    if (firstWarning >= 0 && lastCritical >= 0) {
      expect(lastCritical).toBeLessThan(firstWarning);
    }
    if (firstInfo >= 0 && firstWarning >= 0) {
      expect(firstWarning).toBeLessThan(firstInfo);
    }
  });

  it("assigns unique IDs to items", () => {
    const facts = makeBaseRepoFacts({
      qualitySignals: { ...makeBaseRepoFacts().qualitySignals, hasReadme: false, hasTests: false },
    });
    const items = buildImprovementItems(facts);
    const ids = items.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
