import fs from "node:fs";
import path from "node:path";
import { scanProject } from "../src/scanner/scanProject";

const WORKSPACE_ROOT = path.resolve(__dirname, "..");
const SAMPLE_PROJECT_ROOT = path.join(WORKSPACE_ROOT, "sample-project");
const EXAMPLES_OUTPUT_ROOT = path.join(WORKSPACE_ROOT, "examples", "sample-project-output");
const SAMPLE_OUTPUT_ROOT = path.join(SAMPLE_PROJECT_ROOT, ".reporadar");
const SANITIZED_ROOT = "<sample-project>";
const SANITIZED_OUTPUT = "<sample-project>/.reporadar";

function sanitizeRepoFactsJson(filePath: string): void {
  const repoFacts = JSON.parse(fs.readFileSync(filePath, "utf8")) as {
    metadata: { rootPath: string; outputPath: string };
  };
  repoFacts.metadata.rootPath = SANITIZED_ROOT;
  repoFacts.metadata.outputPath = SANITIZED_OUTPUT;
  fs.writeFileSync(filePath, `${JSON.stringify(repoFacts, null, 2)}\n`, "utf8");
}

function main(): void {
  fs.rmSync(EXAMPLES_OUTPUT_ROOT, { recursive: true, force: true });
  scanProject(SAMPLE_PROJECT_ROOT);
  fs.mkdirSync(EXAMPLES_OUTPUT_ROOT, { recursive: true });
  fs.cpSync(SAMPLE_OUTPUT_ROOT, EXAMPLES_OUTPUT_ROOT, { recursive: true });
  sanitizeRepoFactsJson(path.join(EXAMPLES_OUTPUT_ROOT, "repo-facts.json"));
  console.log(`Example outputs refreshed at ${EXAMPLES_OUTPUT_ROOT}`);
}

main();
