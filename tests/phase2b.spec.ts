import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli";
import { scanProject } from "../src/scanner/scanProject";
import { copyFixture, cleanupFixture } from "./helpers/fixtureHarness";

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

describe("phase 2B monorepo, python, and deployment support", () => {
  it("detects npm workspaces monorepos and enriches repo-facts", () => {
    const fixturePath = copyFixture("monorepo-npm-workspaces");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.monorepo.isMonorepo).toBe(true);
    expect(repoFacts.monorepo.workspaceManager).toBe("npm");
    expect(repoFacts.monorepo.workspaceGlobs).toEqual(expect.arrayContaining(["apps/*", "packages/*"]));
    expect(repoFacts.monorepo.detectedApps).toEqual(expect.arrayContaining(["apps/api", "apps/web"]));
    expect(repoFacts.monorepo.detectedPackages).toEqual(expect.arrayContaining(["packages/config", "packages/ui"]));
    expect(repoFacts.packageSummary.workspacePackageCount).toBeGreaterThanOrEqual(4);
    expect(repoFacts.qualitySignals.hasWorkspaceConfig).toBe(true);
    expect(repoFacts.qualitySignals.hasRootLockfile).toBe(true);
  });

  it("detects pnpm workspace monorepos and turborepo signals", () => {
    const fixturePath = copyFixture("monorepo-pnpm-turbo");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.monorepo.isMonorepo).toBe(true);
    expect(repoFacts.monorepo.workspaceManager).toBe("pnpm");
    expect(repoFacts.monorepo.monorepoTools).toContain("Turborepo");
    expect(repoFacts.monorepo.detectedServices).toContain("services/worker");
    expect(repoFacts.monorepo.detectedLibraries).toContain("libs/shared");
    expect(repoFacts.detectedFrameworks).toContain("Next.js");
  });

  it("detects Python FastAPI and Flask projects", () => {
    const fastApiPath = copyFixture("python-fastapi");
    const flaskPath = copyFixture("python-flask");
    cleanupTargets.push(fastApiPath, flaskPath);

    const fastApiFacts = scanProject(fastApiPath);
    expect(fastApiFacts.projectType).toBe("backend-api");
    expect(fastApiFacts.ecosystems.python.detected).toBe(true);
    expect(fastApiFacts.ecosystems.python.frameworks).toContain("FastAPI");
    expect(fastApiFacts.detectedFrameworks).toContain("Pytest");
    expect(fastApiFacts.packageManager).toBe("pip");

    const flaskFacts = scanProject(flaskPath);
    expect(flaskFacts.projectType).toBe("backend-api");
    expect(flaskFacts.ecosystems.python.frameworks).toContain("Flask");
  });

  it("detects Python package layouts safely", () => {
    const fixturePath = copyFixture("python-package");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.projectType).toBe("library-package");
    expect(repoFacts.ecosystems.python.detected).toBe(true);
    expect(repoFacts.packageSummary.hasRootPyprojectToml).toBe(true);
  });

  it("detects deployment and devops signals", () => {
    const fixturePath = copyFixture("dockerized-app");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.deployment.tools).toEqual(expect.arrayContaining(["Docker", "Docker Compose", "Nginx"]));
    expect(repoFacts.deployment.platforms).toContain("Render");
    expect(repoFacts.metadata.importantConfigFiles).toEqual(
      expect.arrayContaining(["Dockerfile", "docker-compose.yml", ".dockerignore", "nginx.conf", "render.yaml"]),
    );
  });

  it("prints monorepo and python hints in CLI output", async () => {
    const monorepoPath = copyFixture("monorepo-npm-workspaces");
    const pythonPath = copyFixture("python-fastapi");
    cleanupTargets.push(monorepoPath, pythonPath);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await runCli(["node", "reporadar", "scan", monorepoPath]);
    await runCli(["node", "reporadar", "scan", pythonPath]);

    const printed = logSpy.mock.calls.map((call) => String(call[0]));
    expect(printed).toContain("Monorepo: Yes");
    expect(printed).toContain("Workspace manager: npm");
    expect(printed).toContain("Ecosystem: Python");
    expect(printed.some((line) => line.includes("Detected Python framework: FastAPI"))).toBe(true);
  });

  it("writes monorepo and deployment context into reports", () => {
    const fixturePath = copyFixture("monorepo-npm-workspaces");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    const factsJson = JSON.parse(fs.readFileSync(path.join(fixturePath, ".reporadar", "repo-facts.json"), "utf8")) as {
      monorepo: { isMonorepo: boolean; detectedApps: string[] };
      deployment: { tools: string[] };
      ecosystems: { primary: string[] };
    };
    expect(factsJson.monorepo.isMonorepo).toBe(true);
    expect(factsJson.monorepo.detectedApps).toContain("apps/web");
    expect(Array.isArray(factsJson.ecosystems.primary)).toBe(true);

    const projectReport = fs.readFileSync(path.join(fixturePath, ".reporadar", "PROJECT_REPORT.md"), "utf8");
    const architectureReport = fs.readFileSync(path.join(fixturePath, ".reporadar", "ARCHITECTURE.md"), "utf8");
    expect(projectReport).toContain("Monorepo Intelligence");
    expect(projectReport).toContain("Deployment Readiness");
    expect(architectureReport).toContain("Workspace Structure");
    expect(repoFacts.metadata.generatedFiles).toContain("PROJECT_REPORT.md");
  });
});
