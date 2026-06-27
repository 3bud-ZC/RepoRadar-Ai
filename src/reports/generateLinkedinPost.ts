import type { RepoFacts } from "../types/repoFacts";

export function generateLinkedinPost(repoFacts: RepoFacts): string {
  const frameworks = repoFacts.detectedFrameworks.join(", ") || "the current project stack";
  const topIssue = repoFacts.issues[0] ?? "repeatable repo intelligence";
  const nextStep = repoFacts.recommendedNextSteps[0] ?? "keep improving the deterministic analysis layer";

  return `# LinkedIn Post: ${repoFacts.metadata.projectName}

## Professional Short Version

I used RepoRadar AI to scan ${repoFacts.metadata.projectName} and turn the repository into deterministic project intelligence without requiring any paid AI.

The scan identified a ${repoFacts.projectType} using ${frameworks}, generated architecture and security reports, and surfaced the next improvement area: ${nextStep}

Health score: ${repoFacts.healthScore}/${repoFacts.healthDetails.maxScore}

## Storytelling Version

One of the recurring problems in software work is that useful project context is usually buried in config files, scripts, folder structure, and half-documented conventions.

RepoRadar AI is designed to pull that context into something reusable. On ${repoFacts.metadata.projectName}, it classified the repo as a ${repoFacts.projectType}, summarized the stack around ${frameworks}, and highlighted a concrete gap to address next: ${topIssue}

What matters is that the output is deterministic, inspectable, and useful before any AI integration exists.

## Hashtags

#RepoRadarAI #TypeScript #NodeJS #DevTools #CodeQuality #OpenSource
`;
}
