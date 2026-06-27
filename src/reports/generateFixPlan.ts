import type { ImprovementItem, RepoFacts } from "../types/repoFacts";
import { bulletList, formatKeyValueTable, orderedList, section } from "../utils/markdown";

function severityLabel(severity: ImprovementItem["severity"]): string {
  return severity.toUpperCase();
}

function effortLabel(effort: ImprovementItem["effort"]): string {
  const map: Record<string, string> = { low: "Low effort", medium: "Medium effort", high: "High effort" };
  return map[effort] ?? effort;
}

function impactLabel(impact: ImprovementItem["impact"]): string {
  const map: Record<string, string> = { low: "Low impact", medium: "Medium impact", high: "High impact" };
  return map[impact] ?? impact;
}

function renderItem(item: ImprovementItem): string {
  const lines: string[] = [
    `### ${item.id}: ${item.title}`,
    "",
    `- **Severity:** ${severityLabel(item.severity)}`,
    `- **Category:** ${item.category}`,
    `- **Effort:** ${effortLabel(item.effort)}`,
    `- **Impact:** ${impactLabel(item.impact)}`,
    `- **Safe for agent:** ${item.safeForAgent ? "Yes" : "Review manually first"}`,
    "",
    "#### Problem",
    item.problem,
    "",
    "#### Recommended Fix",
    item.recommendedFix,
    "",
    "#### Acceptance Criteria",
    orderedList(item.acceptanceCriteria),
    "",
    "#### Suggested Files",
    bulletList(item.suggestedFiles),
    "",
  ];
  return lines.join("\n");
}

export function generateFixPlan(repoFacts: RepoFacts): string {
  const critical = repoFacts.improvementItems.filter((i) => i.severity === "critical");
  const warnings = repoFacts.improvementItems.filter((i) => i.severity === "warning");
  const info = repoFacts.improvementItems.filter((i) => i.severity === "info");

  const summary = [
    `Total improvement items: ${repoFacts.improvementItems.length}`,
    `Critical: ${critical.length}`,
    `Warnings: ${warnings.length}`,
    `Info: ${info.length}`,
    `Health score: ${repoFacts.healthScore}/${repoFacts.healthDetails.maxScore}`,
  ];

  const sections: string[] = [
    `# Fix Plan: ${repoFacts.metadata.projectName}`,
    "",
    section("Executive Summary", bulletList(summary)),
    section(
      "Priority Order",
      orderedList([
        "Address all critical items first",
        "Address warning items next",
        "Apply info items when convenient",
        "Validate changes by running tests/build",
      ]),
    ),
  ];

  if (critical.length > 0) {
    sections.push(section("Critical Fixes", critical.map(renderItem).join("\n")));
  }
  if (warnings.length > 0) {
    sections.push(section("Warnings", warnings.map(renderItem).join("\n")));
  }
  if (info.length > 0) {
    sections.push(section("Improvements", info.map(renderItem).join("\n")));
  }

  if (repoFacts.improvementItems.length === 0) {
    sections.push(section("Status", "No actionable improvement items were detected. The project looks clean."));
  }

  sections.push(
    section(
      "Safe AI-Agent Notes",
      bulletList([
        "Items marked 'Safe for agent: Yes' can be handed to an AI coding agent.",
        "Items marked 'Review manually first' may require human judgment before automation.",
        "Always run tests and builds after any automated changes.",
        "Never expose secrets or real credentials in generated files.",
      ]),
    ),
  );

  return sections.join("\n");
}
