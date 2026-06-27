import type { RepoFacts } from "../types/repoFacts";
import { bulletList, section } from "../utils/markdown";

export function generateTechStackReport(repoFacts: RepoFacts): string {
  const languageLines = repoFacts.detectedLanguages.map((language) => `${language.name}: ${language.fileCount} files`);

  return [
    `# Tech Stack: ${repoFacts.metadata.projectName}`,
    "",
    section("Ecosystems", bulletList(repoFacts.ecosystems.primary.map((ecosystem) => `${ecosystem}`))),
    section("Languages", bulletList(languageLines)),
    section("Frameworks And Tools", bulletList(repoFacts.detectedFrameworks)),
    section(
      "Module Resolution Signals",
      bulletList([
        `Alias config files: ${repoFacts.architecture.moduleResolution.configFiles.join(", ") || "none detected"}`,
        `Alias patterns: ${repoFacts.architecture.moduleResolution.aliases.map((alias) => `${alias.pattern} -> ${alias.targets.join(", ")}`).join(" | ") || "none detected"}`,
        `Base paths: ${repoFacts.architecture.moduleResolution.basePaths.map((item) => `${item.path || "."} (${item.source})`).join(" | ") || "none detected"}`,
      ]),
    ),
    section("Package Manager", repoFacts.packageManager ?? "Not detected"),
    section(
      "Python Signals",
      bulletList([
        `Python detected: ${repoFacts.ecosystems.python.detected ? "yes" : "no"}`,
        `Python frameworks: ${repoFacts.ecosystems.python.frameworks.join(", ") || "none detected"}`,
        `Python testing tools: ${repoFacts.ecosystems.python.testingTools.join(", ") || "none detected"}`,
        `Python package files: ${repoFacts.ecosystems.python.packageFiles.join(", ") || "none detected"}`,
        `Python dependency files: ${repoFacts.ecosystems.python.dependencyFiles.join(", ") || "none detected"}`,
      ]),
    ),
    section(
      "Monorepo Signals",
      bulletList([
        `Monorepo: ${repoFacts.monorepo.isMonorepo ? "yes" : "no"}`,
        `Workspace manager: ${repoFacts.monorepo.workspaceManager ?? "not detected"}`,
        `Monorepo tools: ${repoFacts.monorepo.monorepoTools.join(", ") || "none detected"}`,
      ]),
    ),
    section(
      "Project Type",
      `RepoRadar AI classified this repository as \`${repoFacts.projectType}\` based on scripts, dependencies, folder structure, and config heuristics.`,
    ),
  ].join("\n");
}
