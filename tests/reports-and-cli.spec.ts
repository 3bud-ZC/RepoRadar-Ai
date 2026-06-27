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

describe("reports and cli output", () => {
  it("generates all required reports and valid repo-facts.json", () => {
    const fixturePath = copyFixture("fullstack-react-express");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    for (const fileName of repoFacts.metadata.generatedFiles) {
      const absolutePath = path.join(fixturePath, ".reporadar", fileName);
      expect(fs.existsSync(absolutePath)).toBe(true);
      expect(fs.readFileSync(absolutePath, "utf8").trim().length).toBeGreaterThan(0);
    }

    const facts = JSON.parse(fs.readFileSync(path.join(fixturePath, ".reporadar", "repo-facts.json"), "utf8")) as {
      projectType: string;
      detectedFrameworks: string[];
    };
    expect(facts.projectType).toBe("full-stack-app");

    const projectReport = fs.readFileSync(path.join(fixturePath, ".reporadar", "PROJECT_REPORT.md"), "utf8");
    const aiPrompt = fs.readFileSync(path.join(fixturePath, ".reporadar", "AI_AGENT_PROMPT.md"), "utf8");
    expect(projectReport).toContain("Executive Summary");
    expect(projectReport).toContain("full-stack-app");
    expect(projectReport).toContain("React");
    expect(aiPrompt).toContain("STATUS.md");
  });

  it("supports --json output for machine-readable summaries", async () => {
    const fixturePath = copyFixture("frontend-vite-react");
    cleanupTargets.push(fixturePath);

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await runCli(["node", "reporadar", "scan", fixturePath, "--json"]);

    const printed = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    const parsed = JSON.parse(printed) as { metadata: { projectName: string }; projectType: string };
    expect(parsed.metadata.projectName).toBe("frontend-vite-react");
    expect(parsed.projectType).toBe("frontend-app");
  });
});
