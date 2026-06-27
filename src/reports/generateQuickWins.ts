import type { ImprovementItem, RepoFacts } from "../types/repoFacts";
import { bulletList, orderedList, section } from "../utils/markdown";

function timeEstimate(effort: ImprovementItem["effort"], impact: ImprovementItem["impact"]): string {
  if (effort === "low" && impact === "high") return "5 min";
  if (effort === "low" && impact === "medium") return "15 min";
  if (effort === "low") return "15 min";
  if (effort === "medium" && impact === "high") return "30 min";
  if (effort === "medium") return "30 min";
  return "1 hour";
}

export function generateQuickWins(repoFacts: RepoFacts): string {
  const quickWins = repoFacts.improvementItems
    .filter((i) => i.effort === "low")
    .sort((a, b) => {
      const impactRank = { high: 0, medium: 1, low: 2 };
      return impactRank[a.impact] - impactRank[b.impact];
    })
    .slice(0, 10);

  const lines: string[] = [
    `# Quick Wins: ${repoFacts.metadata.projectName}`,
    "",
    "Low-effort, high-impact improvements you can apply today.",
    "",
    section(
      "Summary",
      bulletList([
        `Total quick wins: ${quickWins.length}`,
        `Health score: ${repoFacts.healthScore}/${repoFacts.healthDetails.maxScore}`,
        `Focus on the top 3 for the fastest visible improvement.`,
      ]),
    ),
  ];

  if (quickWins.length === 0) {
    lines.push(section("Status", "No quick wins were identified. The project may already be well maintained, or improvements require more effort."));
  } else {
    lines.push("## Top Quick Wins");
    lines.push("");

    for (const item of quickWins) {
      lines.push(`### ${item.id}: ${item.title}`);
      lines.push("");
      lines.push(`- **Estimated time:** ${timeEstimate(item.effort, item.impact)}`);
      lines.push(`- **Impact:** ${item.impact}`);
      lines.push(`- **Category:** ${item.category}`);
      lines.push(`- **Safe for agent:** ${item.safeForAgent ? "Yes" : "Review manually"}`);
      lines.push("");
      lines.push("**Why it helps:**");
      lines.push(item.problem);
      lines.push("");
      lines.push("**What to do:**");
      lines.push(item.recommendedFix);
      lines.push("");
      lines.push("**Suggested files:**");
      lines.push(bulletList(item.suggestedFiles));
      lines.push("");
    }
  }

  lines.push(
    section(
      "How to Use This List",
      orderedList([
        "Pick one item from the top.",
        "Open the suggested files.",
        "Apply the recommended fix.",
        "Run tests/build to verify.",
        "Commit and move to the next item.",
      ]),
    ),
  );

  return lines.join("\n");
}
