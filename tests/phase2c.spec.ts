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

describe("phase 2C architecture intelligence", () => {
  it("detects entrypoints and express routes", () => {
    const fixturePath = copyFixture("express-routes");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.architecture.entrypoints.some((entrypoint) => entrypoint.file === "src/server.ts")).toBe(true);
    expect(
      repoFacts.architecture.routes.some(
        (route) => route.source === "Express" && route.method === "GET" && route.path === "/health",
      ),
    ).toBe(true);
    expect(
      repoFacts.architecture.routes.some(
        (route) => route.source === "Express" && route.method === "POST" && route.path === "/users",
      ),
    ).toBe(true);
  });

  it("detects nextjs app router routes and entrypoints", () => {
    const fixturePath = copyFixture("nextjs-app-router");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.architecture.entrypoints.some((entrypoint) => entrypoint.file === "app/layout.tsx")).toBe(true);
    expect(repoFacts.architecture.routes.some((route) => route.path === "/" && route.source === "Next.js App Router")).toBe(true);
    expect(
      repoFacts.architecture.routes.some(
        (route) => route.path === "/dashboard" && route.source === "Next.js App Router",
      ),
    ).toBe(true);
    expect(
      repoFacts.architecture.routes.some(
        (route) => route.path === "/api/hello" && route.source === "Next.js App Router API" && route.method === "GET",
      ),
    ).toBe(true);
  });

  it("detects react router hints and import relationships", () => {
    const fixturePath = copyFixture("react-router-app");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.architecture.routes.some((route) => route.path === "/" && route.source.includes("React Router"))).toBe(true);
    expect(repoFacts.architecture.routes.some((route) => route.path === "/settings")).toBe(true);
    expect(
      repoFacts.architecture.imports.some(
        (item) => item.file === "src/main.tsx" && item.target === "./routes" && item.internal,
      ),
    ).toBe(true);
  });

  it("detects fastapi and flask routes", () => {
    const fastApiPath = copyFixture("fastapi-routes");
    const flaskPath = copyFixture("flask-routes");
    cleanupTargets.push(fastApiPath, flaskPath);

    const fastApiFacts = scanProject(fastApiPath);
    expect(
      fastApiFacts.architecture.routes.some(
        (route) => route.source === "FastAPI" && route.method === "GET" && route.path === "/health",
      ),
    ).toBe(true);
    expect(
      fastApiFacts.architecture.imports.some(
        (item) => item.kind === "python-from-import" && item.target === "fastapi",
      ),
    ).toBe(true);

    const flaskFacts = scanProject(flaskPath);
    expect(
      flaskFacts.architecture.routes.some(
        (route) => route.source === "Flask" && route.method === "GET" && route.path === "/health",
      ),
    ).toBe(true);
    expect(
      flaskFacts.architecture.routes.some(
        (route) => route.source === "Flask" && route.method?.includes("POST") && route.path === "/reports",
      ),
    ).toBe(true);
  });

  it("detects prisma models, database layer, and important files", () => {
    const fixturePath = copyFixture("prisma-project");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.architecture.dataModels.map((model) => model.name)).toEqual(
      expect.arrayContaining(["User", "Report"]),
    );
    expect(repoFacts.architecture.layers.some((layer) => layer.name === "database")).toBe(true);
    expect(repoFacts.architecture.importantFiles.some((file) => file.file === "prisma/schema.prisma")).toBe(true);
  });

  it("detects environment variable names without exposing values", () => {
    const fixturePath = copyFixture("env-usage-project");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    const envNames = repoFacts.architecture.envUsage.map((usage) => usage.name);
    expect(envNames).toEqual(expect.arrayContaining(["DATABASE_URL", "VITE_API_URL"]));

    const factsJson = fs.readFileSync(path.join(fixturePath, ".reporadar", "repo-facts.json"), "utf8");
    expect(factsJson).not.toContain("fake-secret-db-url");
    expect(factsJson).not.toContain("https://secret.example.test");
  });

  it("detects monorepo package relationships", () => {
    const fixturePath = copyFixture("monorepo-package-links");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    expect(repoFacts.architecture.packageRelationships).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          fromPackage: "@fixture/web-links",
          toPackage: "@fixture/ui-kit",
        }),
      ]),
    );
  });

  it("upgrades architecture-facing reports and json output", async () => {
    const fixturePath = copyFixture("express-routes");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    const architectureReport = fs.readFileSync(path.join(fixturePath, ".reporadar", "ARCHITECTURE.md"), "utf8");
    const aiPrompt = fs.readFileSync(path.join(fixturePath, ".reporadar", "AI_AGENT_PROMPT.md"), "utf8");
    const readmeSuggestion = fs.readFileSync(path.join(fixturePath, ".reporadar", "README_SUGGESTION.md"), "utf8");

    expect(architectureReport).toContain("Architecture Summary");
    expect(architectureReport).toContain("Routes And API Surface");
    expect(architectureReport).toContain("Environment Variable Names");
    expect(aiPrompt).toContain("Architecture style");
    expect(aiPrompt).toContain("Run tests before reporting completion.");
    expect(readmeSuggestion).toContain("Architecture");
    expect(readmeSuggestion).toContain("API And Routes");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await runCli(["node", "reporadar", "scan", fixturePath, "--json"]);
    const parsed = JSON.parse(logSpy.mock.calls.map((call) => String(call[0])).join("\n")) as {
      architecture: { entrypoints: Array<{ file: string }>; routes: Array<{ path: string }> };
    };
    expect(parsed.architecture.entrypoints.some((entrypoint) => entrypoint.file === "src/server.ts")).toBe(true);
    expect(parsed.architecture.routes.some((route) => route.path === "/health")).toBe(true);
  });
});
