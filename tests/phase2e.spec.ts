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

describe("phase 2E alias-aware analysis and broader framework coverage", () => {
  it("resolves aliases from tsconfig and vite hints and upgrades route and model coverage", () => {
    const fixturePath = copyFixture("alias-resolution-app");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);

    expect(repoFacts.projectType).toBe("full-stack-app");
    expect(repoFacts.detectedFrameworks).toEqual(
      expect.arrayContaining(["React", "React Router", "Fastify", "Drizzle ORM", "Zod", "Vite"]),
    );
    expect(repoFacts.architecture.moduleResolution.configFiles).toEqual(
      expect.arrayContaining(["tsconfig.json", "vite.config.ts"]),
    );
    expect(repoFacts.architecture.moduleResolution.aliases).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ pattern: "@/*" }),
        expect.objectContaining({ pattern: "@models/*" }),
        expect.objectContaining({ pattern: "~routes/*" }),
      ]),
    );
    expect(repoFacts.architecture.moduleResolution.aliasResolvedImports).toBeGreaterThan(0);
    expect(repoFacts.architecture.moduleResolution.baseUrlResolvedImports).toBeGreaterThan(0);
    expect(repoFacts.architecture.moduleResolution.resolvedInternalImports).toBeGreaterThanOrEqual(5);
    expect(
      repoFacts.dependencyGraph.internalEdges.some(
        (edge) => edge.from === "src/main.tsx" && edge.to === "src/app/AppShell.tsx",
      ),
    ).toBe(true);
    expect(
      repoFacts.dependencyGraph.internalEdges.some(
        (edge) => edge.from === "server/routes/api.ts" && edge.to === "server/plugins/index.ts",
      ),
    ).toBe(true);
    expect(repoFacts.architecture.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ path: "/settings", source: "React Router Config" }),
        expect.objectContaining({ path: "/health", source: "Fastify" }),
      ]),
    );
    expect(repoFacts.architecture.dataModels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "users", source: "Drizzle Table" }),
        expect.objectContaining({ name: "UserSchema", source: "Zod Schema" }),
      ]),
    );
    expect(repoFacts.architecture.architectureStyle).toBe("hybrid full-stack web application");
  });

  it("detects broader JS and TS framework families and expanded file-based routes", () => {
    const fixturePath = copyFixture("framework-breadth-web");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);

    expect(repoFacts.detectedFrameworks).toEqual(
      expect.arrayContaining([
        "Vue",
        "Nuxt",
        "Angular",
        "Svelte",
        "SvelteKit",
        "Astro",
        "Remix",
        "SolidJS",
        "Preact",
        "NestJS",
        "Koa",
        "Hono",
        "Mongoose",
        "Sequelize",
        "TypeORM",
      ]),
    );
    expect(repoFacts.projectType).toBe("full-stack-app");
    expect(repoFacts.architecture.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "SvelteKit Routes", path: "/" }),
        expect.objectContaining({ source: "Astro Pages", path: "/" }),
        expect.objectContaining({ source: "Remix Routes", path: "/dashboard" }),
        expect.objectContaining({ source: "Angular Router", path: "reports" }),
        expect.objectContaining({ source: "Vue Router", path: "/billing" }),
        expect.objectContaining({ source: "NestJS Controller", path: "/users/invite" }),
      ]),
    );
    expect(repoFacts.architecture.dataModels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "Article", source: "Mongoose Model" }),
        expect.objectContaining({ name: "Account", source: "TypeORM Entity" }),
        expect.objectContaining({ name: "AuditLog", source: "Sequelize Model" }),
      ]),
    );
  });

  it("detects broader Python frameworks, routes, and data models", () => {
    const fixturePath = copyFixture("python-framework-mix");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);

    expect(repoFacts.detectedFrameworks).toEqual(expect.arrayContaining(["Django", "FastAPI", "Typer"]));
    expect(repoFacts.ecosystems.python.frameworks).toEqual(expect.arrayContaining(["Django", "FastAPI", "Typer"]));
    expect(repoFacts.projectType).toBe("backend-api");
    expect(repoFacts.architecture.routes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ source: "Django URLs", path: "/health/" }),
        expect.objectContaining({ source: "FastAPI", path: "/api/health" }),
      ]),
    );
    expect(repoFacts.architecture.dataModels).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ name: "UserProfile", source: "Django Model" }),
        expect.objectContaining({ name: "UserPayload", source: "Pydantic Model" }),
      ]),
    );
    expect(repoFacts.architecture.architectureStyle).toBe("python web service");
  });

  it("upgrades reports and cli output with alias and framework facts", async () => {
    const fixturePath = copyFixture("alias-resolution-app");
    cleanupTargets.push(fixturePath);

    const repoFacts = scanProject(fixturePath);
    const projectReport = fs.readFileSync(path.join(fixturePath, ".reporadar", "PROJECT_REPORT.md"), "utf8");
    const architectureReport = fs.readFileSync(path.join(fixturePath, ".reporadar", "ARCHITECTURE.md"), "utf8");
    const techStackReport = fs.readFileSync(path.join(fixturePath, ".reporadar", "TECH_STACK.md"), "utf8");
    const aiPrompt = fs.readFileSync(path.join(fixturePath, ".reporadar", "AI_AGENT_PROMPT.md"), "utf8");
    const readmeSuggestion = fs.readFileSync(path.join(fixturePath, ".reporadar", "README_SUGGESTION.md"), "utf8");

    expect(projectReport).toContain("Module Resolution");
    expect(projectReport).toContain("Route And Data Coverage");
    expect(architectureReport).toContain("Alias Patterns");
    expect(architectureReport).toContain("Module Resolution");
    expect(techStackReport).toContain("Module Resolution Signals");
    expect(aiPrompt).toContain("Module Resolution");
    expect(readmeSuggestion).toContain("Alias config files:");

    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);
    await runCli(["node", "reporadar", "scan", fixturePath]);
    const humanOutput = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(humanOutput).toContain("Architecture style:");
    expect(humanOutput).toContain("Frameworks:");
    expect(humanOutput).toContain("Module resolution:");
    expect(humanOutput).toContain("Alias config files:");
    expect(humanOutput).toContain("Route sources:");
    expect(humanOutput).toContain("Data model sources:");

    logSpy.mockClear();
    await runCli(["node", "reporadar", "scan", fixturePath, "--json"]);
    const parsed = JSON.parse(logSpy.mock.calls.map((call) => String(call[0])).join("\n")) as {
      architecture: {
        moduleResolution: {
          aliases: Array<{ pattern: string }>;
        };
      };
      detectedFrameworks: string[];
    };
    expect(parsed.architecture.moduleResolution.aliases.length).toBeGreaterThan(0);
    expect(parsed.detectedFrameworks).toContain("Fastify");
    expect(repoFacts.metadata.generatedFiles).toContain("TECH_STACK.md");
  });
});
