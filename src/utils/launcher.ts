import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { scanProject } from "../scanner/scanProject";
import { openFileOrFolder, openInDefaultEditor } from "./openFile";

function isWindows(): boolean {
  return process.platform === "win32";
}

function prompt(message: string): string {
  try {
    const buf = Buffer.alloc(4096);
    process.stdout.write(message);
    const bytesRead = fs.readSync(process.stdin.fd, buf, 0, buf.length, null);
    const input = buf.toString("utf8", 0, bytesRead).trim();
    return input;
  } catch {
    return "";
  }
}

function pickFolderWithPowerShell(): string | null {
  if (!isWindows()) return null;

  const psScript = [
    "Add-Type -AssemblyName System.Windows.Forms",
    "$f = New-Object System.Windows.Forms.FolderBrowserDialog",
    "$f.Description = 'Select a project folder to scan with RepoRadar AI'",
    "$f.RootFolder = 'Desktop'",
    "$result = $f.ShowDialog()",
    "if ($result -eq [System.Windows.Forms.DialogResult]::OK) { Write-Output $f.SelectedPath } else { Write-Output '' }",
  ].join("; ");

  try {
    const result = execSync(`powershell -NoProfile -ExecutionPolicy Bypass -Command "${psScript}"`, {
      encoding: "utf8",
      timeout: 30000,
      windowsHide: true,
    });
    const cleaned = result.trim();
    if (cleaned && fs.existsSync(cleaned) && fs.statSync(cleaned).isDirectory()) {
      return cleaned;
    }
    return null;
  } catch {
    return null;
  }
}

function printLauncherBanner(): void {
  console.log("");
  console.log("============================================");
  console.log("  RepoRadar AI Launcher");
  console.log("  Instant repository intelligence");
  console.log("============================================");
  console.log("");
}

function printMenu(): void {
  console.log("Choose an option:");
  console.log("  1. Pick folder (Windows folder picker)");
  console.log("  2. Enter folder path manually");
  console.log("  3. Exit");
  console.log("");
}

function printPostScanMenu(outputDir: string): void {
  console.log("");
  console.log("What would you like to do next?");
  console.log("  1. Open output folder");
  console.log("  2. Open PROJECT_REPORT.md");
  console.log("  3. Open ARCHITECTURE.md");
  console.log("  4. Open AI_AGENT_PROMPT.md");
  console.log("  5. Open FIX_PLAN.md");
  console.log("  6. Open QUICK_WINS.md");
  console.log("  7. Open AGENT_FIX_PROMPT.md");
  console.log("  8. Exit");
  console.log("");
}

export function runLauncher(): void {
  printLauncherBanner();

  let selectedPath: string | null = null;

  while (!selectedPath) {
    printMenu();
    const choice = prompt("Enter 1, 2, or 3: ");

    if (choice === "1") {
      selectedPath = pickFolderWithPowerShell();
      if (!selectedPath) {
        console.log("Folder picker failed or was cancelled. Try manual entry.");
      }
    } else if (choice === "2") {
      const manualPath = prompt("Enter the full path to your project folder: ").trim();
      if (!manualPath) {
        console.log("No path entered.");
        continue;
      }
      const resolved = path.resolve(manualPath);
      if (!fs.existsSync(resolved) || !fs.statSync(resolved).isDirectory()) {
        console.log(`Path does not exist or is not a directory: ${resolved}`);
        continue;
      }
      selectedPath = resolved;
    } else if (choice === "3") {
      console.log("Exiting. Goodbye!");
      return;
    } else {
      console.log("Invalid choice. Please enter 1, 2, or 3.");
    }
  }

  console.log("");
  console.log(`Scanning: ${selectedPath}`);
  console.log("Please wait...");
  console.log("");

  try {
    const repoFacts = scanProject(selectedPath);
    const outputDir = repoFacts.metadata.outputPath;
    const reportPath = path.join(outputDir, "PROJECT_REPORT.md");
    const archPath = path.join(outputDir, "ARCHITECTURE.md");
    const agentPath = path.join(outputDir, "AI_AGENT_PROMPT.md");

    console.log("============================================");
    console.log("  Scan Complete");
    console.log("============================================");
    console.log(`Project name:    ${repoFacts.metadata.projectName}`);
    console.log(`Project type:    ${repoFacts.projectType}`);
    console.log(`Architecture:    ${repoFacts.architecture.architectureStyle}`);
    console.log(`Health score:    ${repoFacts.healthScore}/${repoFacts.healthDetails.maxScore}`);
    console.log(`Output folder:   ${outputDir}`);
    console.log("");
    console.log("Generated files:");
    for (const fileName of repoFacts.metadata.generatedFiles) {
      console.log(`  - ${fileName}`);
    }
    console.log("");

    if (repoFacts.architectureRisks.length > 0) {
      console.log("Top risks:");
      for (const risk of repoFacts.architectureRisks.slice(0, 3)) {
        console.log(`  [${risk.severity.toUpperCase()}] ${risk.title}`);
      }
      console.log("");
    }

    console.log("Recommended first file: PROJECT_REPORT.md");
    console.log("");

    const fixPlanPath = path.join(outputDir, "FIX_PLAN.md");
    const quickWinsPath = path.join(outputDir, "QUICK_WINS.md");
    const agentFixPath = path.join(outputDir, "AGENT_FIX_PROMPT.md");

    let postChoice = "";
    while (postChoice !== "8") {
      printPostScanMenu(outputDir);
      postChoice = prompt("Enter 1-8: ");

      if (postChoice === "1") {
        openFileOrFolder(outputDir);
        console.log("Opening output folder...");
      } else if (postChoice === "2") {
        openInDefaultEditor(reportPath);
        console.log("Opening PROJECT_REPORT.md...");
      } else if (postChoice === "3") {
        openInDefaultEditor(archPath);
        console.log("Opening ARCHITECTURE.md...");
      } else if (postChoice === "4") {
        openInDefaultEditor(agentPath);
        console.log("Opening AI_AGENT_PROMPT.md...");
      } else if (postChoice === "5") {
        openInDefaultEditor(fixPlanPath);
        console.log("Opening FIX_PLAN.md...");
      } else if (postChoice === "6") {
        openInDefaultEditor(quickWinsPath);
        console.log("Opening QUICK_WINS.md...");
      } else if (postChoice === "7") {
        openInDefaultEditor(agentFixPath);
        console.log("Opening AGENT_FIX_PROMPT.md...");
      } else if (postChoice === "8") {
        console.log("Exiting. Goodbye!");
      } else {
        console.log("Invalid choice.");
      }
    }
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`Scan failed: ${message}`);
    console.log("");
    console.log("Press Enter to exit...");
    prompt("");
  }
}
