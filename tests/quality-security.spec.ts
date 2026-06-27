import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { scanProject } from "../src/scanner/scanProject";
import { copyFixture, cleanupFixture } from "./helpers/fixtureHarness";

const cleanupTargets: string[] = [];

afterEach(() => {
  while (cleanupTargets.length > 0) {
    const target = cleanupTargets.pop();
    if (target) {
      cleanupFixture(target);
    }
  }
});

describe("quality and security signals", () => {
  it("detects readme, license, env example, tests, scripts, dockerfile, and deployment docs", () => {
    const fixturePath = copyFixture("frontend-vite-react");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.qualitySignals).toMatchObject({
      hasReadme: true,
      hasLicense: true,
      hasEnvExample: true,
      hasTests: true,
      hasBuildScript: true,
      hasDevScript: true,
      hasDockerfile: false,
      hasDeploymentDocs: false,
    });

    const backendPath = copyFixture("backend-express");
    cleanupTargets.push(backendPath);
    const backendFacts = scanProject(backendPath);
    expect(backendFacts.qualitySignals.hasDockerfile).toBe(true);
    expect(backendFacts.qualitySignals.hasDeploymentDocs).toBe(true);
  });

  it("detects env risks and hardcoded secret patterns without exposing values", () => {
    const fixturePath = copyFixture("risky-env-project");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.securitySignals.envFilesDetected).toEqual([".env"]);
    expect(repoFacts.securitySignals.envRiskWarning).toBe(true);
    expect(repoFacts.securitySignals.possibleHardcodedSecrets).toHaveLength(1);

    const projectReport = fs.readFileSync(path.join(fixturePath, ".reporadar", "SECURITY_NOTES.md"), "utf8");
    const factsJson = fs.readFileSync(path.join(fixturePath, ".reporadar", "repo-facts.json"), "utf8");

    expect(projectReport).not.toContain("fake-secret-12345678");
    expect(projectReport).not.toContain("placeholder-env-value");
    expect(factsJson).not.toContain("fake-secret-12345678");
    expect(factsJson).not.toContain("placeholder-env-value");
  });
});

