import type { RepoFacts } from "../types/repoFacts";
import { bulletList, section } from "../utils/markdown";

export function generatePortfolioCaseStudy(repoFacts: RepoFacts): string {
  return [
    `# Portfolio Case Study: ${repoFacts.metadata.projectName}`,
    "",
    section(
      "Problem",
      "Repositories often contain valuable context, but it is fragmented across code, configuration, scripts, and lightweight docs. That slows onboarding, audits, and AI-assisted workflows.",
    ),
    section(
      "Solution",
      `RepoRadar AI scanned the repository deterministically, classified it as a ${repoFacts.projectType}, and generated reusable outputs for architecture, tech stack, security review, README drafting, and AI-agent onboarding.`,
    ),
    section("Tech Stack", bulletList(repoFacts.detectedFrameworks)),
    section(
      "Features",
      bulletList([
        "Deterministic repo scanning with no paid AI requirement",
        "Project type classification and stack detection",
        "Explainable health scoring with lost-point reasons",
        "Safe security reporting that avoids exposing secret values",
      ]),
    ),
    section(
      "Engineering Highlights",
      bulletList([
        `Health score generated: ${repoFacts.healthScore}/${repoFacts.healthDetails.maxScore}`,
        `Files scanned: ${repoFacts.metadata.totalFilesScanned}`,
        `Important config files detected: ${repoFacts.metadata.importantConfigFiles.join(", ") || "none"}`,
      ]),
    ),
    section("Next Improvements", bulletList(repoFacts.recommendedNextSteps)),
  ].join("\n");
}
