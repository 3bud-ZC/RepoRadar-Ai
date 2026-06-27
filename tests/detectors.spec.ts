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

describe("deterministic detectors", () => {
  it("detects frontend stack signals", () => {
    const fixturePath = copyFixture("frontend-vite-react");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.projectType).toBe("frontend-app");
    expect(repoFacts.detectedFrameworks).toEqual(
      expect.arrayContaining(["React", "Vite", "Tailwind CSS", "Vitest", "ESLint", "Prettier"]),
    );
    expect(repoFacts.detectedLanguages.some((language) => language.name === "TypeScript")).toBe(true);
  });

  it("detects backend stack signals", () => {
    const fixturePath = copyFixture("backend-express");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.projectType).toBe("backend-api");
    expect(repoFacts.detectedFrameworks).toEqual(expect.arrayContaining(["Express", "Docker", "Jest", "GitHub Actions"]));
  });

  it("detects full-stack stack signals", () => {
    const fixturePath = copyFixture("fullstack-react-express");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.projectType).toBe("full-stack-app");
    expect(repoFacts.detectedFrameworks).toEqual(
      expect.arrayContaining(["React", "Express", "Prisma", "PostgreSQL", "Playwright", "Docker"]),
    );
  });

  it("detects cli-tool and library-package safely", () => {
    const cliPath = copyFixture("cli-tool");
    const libraryPath = copyFixture("library-package");
    cleanupTargets.push(cliPath, libraryPath);

    expect(scanProject(cliPath).projectType).toBe("cli-tool");
    expect(scanProject(libraryPath).projectType).toBe("library-package");
  });

  it("falls back to unknown safely and can still detect Next.js", () => {
    const fixturePath = copyFixture("risky-env-project");
    cleanupTargets.push(fixturePath);

    const nextConfigPath = path.join(fixturePath, "next.config.ts");
    fs.writeFileSync(nextConfigPath, "export default {};\n", "utf8");

    const nextProject = scanProject(fixturePath);
    expect(nextProject.detectedFrameworks).toContain("Next.js");

    fs.rmSync(nextConfigPath);

    const unknownProject = scanProject(fixturePath);
    expect(unknownProject.projectType).toBe("unknown");
  });
});

