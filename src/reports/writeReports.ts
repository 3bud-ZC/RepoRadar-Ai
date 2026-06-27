import path from "node:path";
import type { RepoFacts } from "../types/repoFacts";
import { ensureDirectory, writeTextFile } from "../utils/fileUtils";
import { generateAgentFixPrompt } from "./generateAgentFixPrompt";
import { generateAiAgentPrompt } from "./generateAiAgentPrompt";
import { generateArchitectureReport } from "./generateArchitectureReport";
import { generateFixPlan } from "./generateFixPlan";
import { generateGitHubIssues } from "./generateGitHubIssues";
import { generateLinkedinPost } from "./generateLinkedinPost";
import { generatePortfolioCaseStudy } from "./generatePortfolioCaseStudy";
import { generateProjectReport } from "./generateProjectReport";
import { generateQuickWins } from "./generateQuickWins";
import { generateReadmeSuggestion } from "./generateReadmeSuggestion";
import { generateSecurityNotes } from "./generateSecurityNotes";
import { generateTechStackReport } from "./generateTechStackReport";

export function writeReports(outputPath: string, repoFacts: RepoFacts): void {
  ensureDirectory(outputPath);

  const outputs: Record<string, string> = {
    "repo-facts.json": JSON.stringify(repoFacts, null, 2),
  };

  if (repoFacts.config.reports.project) {
    outputs["PROJECT_REPORT.md"] = generateProjectReport(repoFacts);
  }
  if (repoFacts.config.reports.architecture) {
    outputs["ARCHITECTURE.md"] = generateArchitectureReport(repoFacts);
  }
  if (repoFacts.config.reports.techStack) {
    outputs["TECH_STACK.md"] = generateTechStackReport(repoFacts);
  }
  if (repoFacts.config.reports.security) {
    outputs["SECURITY_NOTES.md"] = generateSecurityNotes(repoFacts);
  }
  if (repoFacts.config.reports.readme) {
    outputs["README_SUGGESTION.md"] = generateReadmeSuggestion(repoFacts);
  }
  if (repoFacts.config.reports.agentPrompt) {
    outputs["AI_AGENT_PROMPT.md"] = generateAiAgentPrompt(repoFacts);
  }
  if (repoFacts.config.reports.linkedin) {
    outputs["LINKEDIN_POST.md"] = generateLinkedinPost(repoFacts);
  }
  if (repoFacts.config.reports.portfolio) {
    outputs["PORTFOLIO_CASE_STUDY.md"] = generatePortfolioCaseStudy(repoFacts);
  }
  if (repoFacts.config.reports.fixPlan) {
    outputs["FIX_PLAN.md"] = generateFixPlan(repoFacts);
  }
  if (repoFacts.config.reports.quickWins) {
    outputs["QUICK_WINS.md"] = generateQuickWins(repoFacts);
  }
  if (repoFacts.config.reports.githubIssues) {
    outputs["GITHUB_ISSUES.md"] = generateGitHubIssues(repoFacts);
  }
  if (repoFacts.config.reports.agentFixPrompt) {
    outputs["AGENT_FIX_PROMPT.md"] = generateAgentFixPrompt(repoFacts);
  }

  repoFacts.metadata.generatedFiles = Object.keys(outputs);

  for (const [fileName, content] of Object.entries(outputs)) {
    writeTextFile(path.join(outputPath, fileName), content);
  }
}
