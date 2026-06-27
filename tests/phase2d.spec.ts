import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli";
import { scanProject } from "../src/scanner/scanProject";
import { cleanupFixture, copyFixture } from "./helpers/fixtureHarness";

const cleanupTargets: string[] = [];

afterEach(() => {
  vi.restoreAllMocks();
  while (cleanupTargets.length > 0) {
    const target = cleanupTargets.pop();
    if (target) {
      cleanupFixture(target);
    }
  }
});

describe("phase 2D real-world hardening", () => {
  it("supports config-driven output paths, include/exclude patterns, and report toggles", () => {
    const fixturePath = copyFixture("config-custom-output");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.metadata.projectName).toBe("Configured Fixture");
    expect(repoFacts.config.configDetected).toBe(true);
    expect(repoFacts.config.outputDir).toBe(".custom-radar");
    expect(repoFacts.metadata.outputPath).toBe(path.join(fixturePath, ".custom-radar"));
    expect(repoFacts.metadata.totalFilesScanned).toBe(4);
    expect(repoFacts.metadata.generatedFiles).not.toContain("LINKEDIN_POST.md");
    expect(repoFacts.metadata.generatedFiles).not.toContain("PORTFOLIO_CASE_STUDY.md");
    expect(fs.existsSync(path.join(fixturePath, ".custom-radar", "PROJECT_REPORT.md"))).toBe(true);
    expect(fs.existsSync(path.join(fixturePath, ".custom-radar", "LINKEDIN_POST.md"))).toBe(false);
    expect(fs.readFileSync(path.join(fixturePath, ".custom-radar", "repo-facts.json"), "utf8")).not.toContain("src/generated/skip.ts");
  });

  it("falls back safely when config values are invalid", () => {
    const fixturePath = copyFixture("config-invalid");
    cleanupTargets.push(fixturePath);

    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const repoFacts = scanProject(fixturePath);

    expect(repoFacts.config.configDetected).toBe(true);
    expect(repoFacts.config.configWarnings.length).toBeGreaterThan(0);
    expect(repoFacts.config.outputDir).toBe(".reporadar");
    expect(repoFacts.metadata.outputPath).toBe(path.join(fixturePath, ".reporadar"));
    expect(warnSpy).toHaveBeenCalled();
  });

  it("tracks skipped files and folders through scan safety metadata", () => {
    const fixturePath = copyFixture("large-noisy-project");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);

    expect(repoFacts.scanSafety.skippedFolders).toBeGreaterThanOrEqual(3);
    expect(repoFacts.scanSafety.skippedFiles).toBeGreaterThanOrEqual(1);
    expect(repoFacts.scanSafety.skippedReasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ reason: "default ignored folder" }),
        expect.objectContaining({ reason: "file exceeds max size" }),
      ]),
    );
  });

  it("builds dependency graph summaries, external package counts, and cycle hints", () => {
    const fixturePath = copyFixture("dependency-graph-app");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);

    expect(repoFacts.dependencyGraph.externalPackages).toEqual(expect.arrayContaining(["express", "lodash", "zod"]));
    expect(
      repoFacts.dependencyGraph.internalEdges.some(
        (edge) => edge.from === "src/server.ts" && edge.to === "src/routes/health.ts",
      ),
    ).toBe(true);
    expect(repoFacts.dependencyGraph.topImportedInternalFiles[0]?.file).toBe("src/lib/logger.ts");
    expect(repoFacts.dependencyGraph.possibleCycles.length).toBeGreaterThan(0);
    expect(repoFacts.hasHealthEndpoint).toBe(true);
    expect(repoFacts.detectedHealthRoutes).toContain("/health");
  });

  it("enriches monorepo package relationships with shared and orphan package hints", () => {
    const fixturePath = copyFixture("monorepo-shared-packages");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.architecture.packageRelationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          sourcePackage: "@fixture/web-dashboard",
          targetPackage: "@fixture/shared-ui",
          importCount: 1,
        }),
        expect.objectContaining({
          sourcePackage: "@fixture/admin-dashboard",
          targetPackage: "@fixture/shared-ui",
        }),
      ]),
    );
    expect(repoFacts.monorepo.packageGraph?.sharedPackages).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          packageName: "@fixture/shared-ui",
          usedBy: expect.arrayContaining(["@fixture/admin-dashboard", "@fixture/web-dashboard"]),
        }),
      ]),
    );
    expect(repoFacts.monorepo.packageGraph?.orphanPackages).toContain("@fixture/orphan");
  });

  it("detects health endpoint gaps and deterministic architecture risks", () => {
    const apiWithoutHealthPath = copyFixture("api-without-health-endpoint");
    const dockerPath = copyFixture("docker-without-dockerignore");
    cleanupTargets.push(apiWithoutHealthPath, dockerPath);

    const apiFacts = scanProject(apiWithoutHealthPath);
    expect(apiFacts.hasHealthEndpoint).toBe(false);
    expect(
      apiFacts.architectureRisks.some((risk) => risk.title.includes("health endpoint")),
    ).toBe(true);

    const dockerFacts = scanProject(dockerPath);
    expect(dockerFacts.architectureRisks.some((risk) => risk.title.includes("Docker"))).toBe(true);
    expect(dockerFacts.issues).toContain("Dockerfile detected without .dockerignore.");
  });

  it("upgrades reports and cli output while keeping --json valid", async () => {
    const fixturePath = copyFixture("dependency-graph-app");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    const architectureReport = fs.readFileSync(path.join(fixturePath, ".reporadar", "ARCHITECTURE.md"), "utf8");
    const projectReport = fs.readFileSync(path.join(fixturePath, ".reporadar", "PROJECT_REPORT.md"), "utf8");
    const securityNotes = fs.readFileSync(path.join(fixturePath, ".reporadar", "SECURITY_NOTES.md"), "utf8");
    const aiPrompt = fs.readFileSync(path.join(fixturePath, ".reporadar", "AI_AGENT_PROMPT.md"), "utf8");
    const readmeSuggestion = fs.readFileSync(path.join(fixturePath, ".reporadar", "README_SUGGESTION.md"), "utf8");

    expect(projectReport).toContain("Scan Safety Summary");
    expect(projectReport).toContain("Dependency Graph Summary");
    expect(architectureReport).toContain("Dependency Graph");
    expect(architectureReport).toContain("Health Endpoint");
    expect(securityNotes).toContain("Config And Scan Safety Notes");
    expect(aiPrompt).toContain("Dependency Graph Summary");
    expect(aiPrompt).toContain("Config Constraints");
    expect(readmeSuggestion).toContain("RepoRadar Config And Scan Notes");

    const humanLogSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await runCli(["node", "reporadar", "scan", fixturePath]);
    const humanOutput = humanLogSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(humanOutput).toContain("Config detected:");
    expect(humanOutput).toContain("Scan safety:");
    expect(humanOutput).toContain("Dependency graph:");
    expect(humanOutput).toContain("Architecture risks count:");
    expect(humanOutput).toContain("Health endpoint detected:");

    humanLogSpy.mockClear();
    await runCli(["node", "reporadar", "scan", fixturePath, "--json"]);
    const parsed = JSON.parse(humanLogSpy.mock.calls.map((call) => String(call[0])).join("\n")) as {
      config: { configDetected: boolean };
      scanSafety: { skippedFiles: number };
      dependencyGraph: { internalEdges: Array<{ from: string; to: string }> };
      architectureRisks: Array<{ title: string }>;
    };
    expect(parsed.config.configDetected).toBe(false);
    expect(parsed.scanSafety.skippedFiles).toBeGreaterThanOrEqual(0);
    expect(parsed.dependencyGraph.internalEdges.length).toBeGreaterThan(0);
    expect(Array.isArray(parsed.architectureRisks)).toBe(true);
    expect(repoFacts.metadata.generatedFiles).toContain("PROJECT_REPORT.md");
  });
});
