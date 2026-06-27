import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { createScanContext, scanProject } from "../src/scanner/scanProject";
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

describe("scanProject", () => {
  it("ignores heavy folders and counts files correctly", () => {
    const fixturePath = copyFixture("frontend-vite-react");
    cleanupTargets.push(fixturePath);

    const ignoredEntries = [
      "node_modules/react/index.js",
      ".git/config",
      "dist/app.js",
      "build/output.js",
      ".next/server.js",
      "coverage/coverage-final.json",
      ".reporadar/old.json",
    ];

    for (const entry of ignoredEntries) {
      const absolutePath = path.join(fixturePath, entry);
      fs.mkdirSync(path.dirname(absolutePath), { recursive: true });
      fs.writeFileSync(absolutePath, "ignored", "utf8");
    }

    const context = createScanContext(fixturePath);
    expect(context.relativeFiles).not.toEqual(expect.arrayContaining(ignoredEntries));
    expect(context.relativeFiles).toHaveLength(10);
  });

  it("detects important config files", () => {
    const fixturePath = copyFixture("frontend-vite-react");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.metadata.importantConfigFiles).toEqual(
      expect.arrayContaining(["package.json", "tsconfig.json", "vite.config.ts", "tailwind.config.ts"]),
    );
  });
});

