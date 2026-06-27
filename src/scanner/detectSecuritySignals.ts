import fs from "node:fs";
import path from "node:path";
import type { ScanContext, SecretFinding, SecuritySignals } from "../types/repoFacts";

const SECRET_PATTERNS: Array<{ name: string; regex: RegExp }> = [
  { name: "AWS access key", regex: /\bAKIA[0-9A-Z]{16}\b/g },
  { name: "GitHub token", regex: /\bghp_[A-Za-z0-9]{20,}\b/g },
  { name: "Slack token", regex: /\bxox[baprs]-[A-Za-z0-9-]{10,}\b/g },
  {
    name: "Generic secret assignment",
    regex: /\b(api[_-]?key|secret|token|password)\b\s*[:=]\s*["'`][^"'`\s]{8,}["'`]/gi,
  },
];

function findEnvFiles(relativeFiles: string[]): string[] {
  return relativeFiles.filter((file) => {
    const baseName = path.basename(file).toLowerCase();
    return baseName === ".env" || (baseName.startsWith(".env.") && baseName !== ".env.example");
  });
}

function readGitignore(rootPath: string): string {
  const gitignorePath = path.join(rootPath, ".gitignore");
  if (!fs.existsSync(gitignorePath)) {
    return "";
  }

  try {
    return fs.readFileSync(gitignorePath, "utf8");
  } catch {
    return "";
  }
}

function envIgnored(gitignoreContent: string): boolean {
  return gitignoreContent
    .split(/\r?\n/)
    .map((line) => line.trim())
    .some((line) => line === ".env" || line === ".env*" || line === "*.env");
}

export function detectSecuritySignals(context: ScanContext): SecuritySignals {
  const envFilesDetected = findEnvFiles(context.relativeFiles);
  const gitignoreContent = readGitignore(context.rootPath);
  const possibleHardcodedSecrets: SecretFinding[] = [];

  for (const [relativePath, content] of context.fileContentCache.entries()) {
    const lines = content.split(/\r?\n/);
    lines.forEach((line, index) => {
      for (const pattern of SECRET_PATTERNS) {
        if (pattern.regex.test(line)) {
          possibleHardcodedSecrets.push({
            file: relativePath,
            line: index + 1,
            pattern: pattern.name,
          });
          break;
        }
        pattern.regex.lastIndex = 0;
      }
    });
  }

  const envIgnoredInGitignore = envIgnored(gitignoreContent);
  const envRiskWarning = envFilesDetected.length > 0 && !envIgnoredInGitignore;

  return {
    envFilesDetected,
    envIgnoredInGitignore,
    envRiskWarning,
    possibleHardcodedSecrets,
  };
}
