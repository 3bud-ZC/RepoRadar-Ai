import type { RepoFacts } from "../types/repoFacts";
import { bulletList, orderedList, section } from "../utils/markdown";

export function generateAgentFixPrompt(repoFacts: RepoFacts): string {
  const topItems = repoFacts.improvementItems
    .filter((i) => i.safeForAgent)
    .slice(0, 8);

  const buildCmd = repoFacts.packageSummary.hasRootPackageJson
    ? "npm run build"
    : repoFacts.packageSummary.hasRootPyprojectToml
      ? "python -m build"
      : "run the project's build command";

  const testCmd = repoFacts.packageSummary.hasRootPackageJson
    ? "npm test"
    : repoFacts.packageSummary.hasRootPyprojectToml
      ? "pytest"
      : "run the project's test command";

  const lines: string[] = [
    `# AI Agent Fix Prompt: ${repoFacts.metadata.projectName}`,
    "",
    "> This prompt is for improving the **scanned project**, not RepoRadar AI itself.",
    "",
    section(
      "Project Summary",
      bulletList([
        `Project name: ${repoFacts.metadata.projectName}`,
        `Project type: ${repoFacts.projectType}`,
        `Architecture: ${repoFacts.architecture.architectureStyle}`,
        `Detected frameworks: ${repoFacts.detectedFrameworks.join(", ") || "none"}`,
        `Languages: ${repoFacts.detectedLanguages.map((l) => l.name).join(", ") || "unknown"}`,
        `Health score: ${repoFacts.healthScore}/${repoFacts.healthDetails.maxScore}`,
        `Files scanned: ${repoFacts.metadata.totalFilesScanned}`,
      ]),
    ),
    section(
      "Top Improvement Items",
      topItems.length === 0
        ? "No safe-for-agent improvement items were identified."
        : orderedList(topItems.map((i) => `${i.id}: ${i.title} (${i.severity}) — ${i.recommendedFix}`)),
    ),
    section(
      "Strict Constraints",
      bulletList([
        "Do NOT expose secrets or real credentials in any file you create or modify.",
        "Do NOT overwrite user work without reading the existing file first.",
        "If the project uses a STATUS.md workflow, maintain exactly one STATUS.md in the project root.",
        "Run tests and build before reporting completion.",
        "Update README.md when behavior changes.",
        "Do NOT invent environment variable values. Use empty placeholders or mark them as required.",
        "Do NOT modify files outside the scanned project scope.",
        "Prefer small, focused changes over large rewrites.",
      ]),
    ),
    section(
      "Exact Task List",
      orderedList([
        "Read the current project structure and key files.",
        "Pick the highest-priority safe-for-agent item from the Top Improvement Items list.",
        "Implement the recommended fix.",
        `Run ${buildCmd} to verify the project still builds.`,
        `Run ${testCmd} to verify tests pass.`,
        "Review your changes for secret exposure or unintended deletions.",
        "Report what was changed, why, and any remaining manual steps.",
      ]),
    ),
    section(
      "Expected Final Response",
      bulletList([
        "A summary of files changed.",
        "A brief explanation of each change.",
        "Build and test results (pass/fail).",
        "Any remaining manual steps or open questions.",
      ]),
    ),
  ];

  return lines.join("\n");
}
