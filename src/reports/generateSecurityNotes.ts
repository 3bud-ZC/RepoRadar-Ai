import type { RepoFacts } from "../types/repoFacts";
import { bulletList, section } from "../utils/markdown";

function buildWarnings(repoFacts: RepoFacts): string[] {
  const warnings: string[] = [];

  if (repoFacts.securitySignals.envRiskWarning) {
    warnings.push("High: `.env` files exist but `.gitignore` does not clearly protect them.");
  }

  if (repoFacts.securitySignals.possibleHardcodedSecrets.length > 0) {
    warnings.push("Medium: potential hardcoded secret patterns were detected. Review the flagged files manually.");
  }

  if (repoFacts.securitySignals.envFilesDetected.length > 0 && !repoFacts.securitySignals.envRiskWarning) {
    warnings.push("Low: env files are present and appear to be ignored; continue documenting required variables through `.env.example`.");
  }

  if (warnings.length === 0) {
    warnings.push("Low: no immediate deterministic security risks were detected.");
  }

  return warnings;
}

export function generateSecurityNotes(repoFacts: RepoFacts): string {
  const secretFindings = repoFacts.securitySignals.possibleHardcodedSecrets.map(
    (finding) => `Medium: ${finding.file}:${finding.line} matched ${finding.pattern}`,
  );
  const envUsageNames = [...new Set(repoFacts.architecture.envUsage.map((usage) => usage.name))];

  return [
    `# Security Notes: ${repoFacts.metadata.projectName}`,
    "",
    section("Severity Summary", bulletList(buildWarnings(repoFacts))),
    section(
      "Environment File Handling",
      bulletList([
        `Detected env-style files: ${repoFacts.securitySignals.envFilesDetected.join(", ") || "none"}`,
        `Env protected by .gitignore: ${repoFacts.securitySignals.envIgnoredInGitignore ? "yes" : "no"}`,
        `Env variable names referenced in code: ${envUsageNames.join(", ") || "none"}`,
        "RepoRadar AI detects env files by name only and does not print their contents.",
      ]),
    ),
    section(
      "Config And Scan Safety Notes",
      bulletList([
        `Config detected: ${repoFacts.config.configDetected ? "yes" : "no"}`,
        `Config warnings: ${repoFacts.config.configWarnings.join(" | ") || "none"}`,
        `Scan truncated: ${repoFacts.scanSafety.truncated ? "yes" : "no"}`,
        `Skipped files: ${repoFacts.scanSafety.skippedFiles}`,
        `Skipped folders: ${repoFacts.scanSafety.skippedFolders}`,
      ]),
    ),
    section(
      "Potential Secret Findings",
      repoFacts.securitySignals.possibleHardcodedSecrets.length > 0
        ? bulletList(secretFindings)
        : "No hardcoded secret patterns were detected by the current heuristic rules.",
    ),
    section(
      "Recommended Remediation",
      bulletList([
        "Keep `.env` files ignored and document variables through `.env.example`.",
        "Review all flagged files manually before rotating credentials or refactoring secret handling.",
        "Prefer environment variables or secret managers over inline values in code or config.",
      ]),
    ),
  ].join("\n");
}
