import fs from "node:fs";
import path from "node:path";
import type { ScanSafetyInfo, SkippedReasonSummary } from "../types/repoFacts";

export const DEFAULT_IGNORED_DIRECTORIES = new Set([
  "node_modules",
  ".git",
  "dist",
  "build",
  ".next",
  "coverage",
  ".reporadar",
  "vendor",
  ".venv",
  "venv",
  "__pycache__",
  ".pytest_cache",
  ".mypy_cache",
  ".turbo",
  ".nx",
  "target",
  "out",
  "generated",
  ".cache",
]);

export const DEFAULT_MAX_FILES = 5000;
export const DEFAULT_MAX_FILE_SIZE_KB = 512;

const TEXT_FILE_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
  ".md",
  ".txt",
  ".vue",
  ".svelte",
  ".astro",
  ".html",
  ".css",
  ".scss",
  ".sass",
  ".less",
  ".yml",
  ".yaml",
  ".env",
  ".py",
  ".sh",
  ".ps1",
  ".sql",
  ".toml",
  ".prisma",
  ".xml",
  ".ini",
  ".cfg",
  ".conf",
]);

interface CollectProjectFilesOptions {
  includePatterns?: string[];
  excludePatterns?: string[];
  maxFiles?: number;
  ignoredDirectories?: Set<string>;
}

interface SkipReasonTracker {
  add(reason: string, count?: number): void;
}

export interface CollectProjectFilesResult {
  files: string[];
  skippedFiles: number;
  skippedFolders: number;
  skippedReasons: SkippedReasonSummary[];
  truncated: boolean;
}

function createSkipReasonTracker(): SkipReasonTracker & { toArray(): SkippedReasonSummary[] } {
  const counts = new Map<string, number>();

  return {
    add(reason: string, count = 1) {
      counts.set(reason, (counts.get(reason) ?? 0) + count);
    },
    toArray() {
      return [...counts.entries()]
        .map(([reason, count]) => ({ reason, count }))
        .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason));
    },
  };
}

function escapeRegExp(input: string): string {
  return input.replace(/[|\\{}()[\]^$+?.]/g, "\\$&");
}

function normalizePattern(pattern: string): string {
  return pattern.replace(/\\/g, "/").replace(/^\.?\//, "").trim();
}

function globToRegExp(pattern: string): RegExp {
  const normalized = normalizePattern(pattern);
  let regex = "^";

  for (let index = 0; index < normalized.length; index += 1) {
    const char = normalized[index];
    const next = normalized[index + 1];

    if (char === "*") {
      if (next === "*") {
        const nextNext = normalized[index + 2];
        if (nextNext === "/") {
          regex += "(?:.*/)?";
          index += 2;
        } else {
          regex += ".*";
          index += 1;
        }
      } else {
        regex += "[^/]*";
      }
      continue;
    }

    if (char === "?") {
      regex += ".";
      continue;
    }

    regex += escapeRegExp(char);
  }

  regex += "$";
  return new RegExp(regex);
}

function matchesAnyPattern(relativePath: string, patterns: string[]): boolean {
  const normalizedPath = relativePath.replace(/\\/g, "/");
  return patterns.some((pattern) => {
    const normalizedPattern = normalizePattern(pattern);
    if (!normalizedPattern) {
      return false;
    }

    const regex = globToRegExp(normalizedPattern);
    return regex.test(normalizedPath);
  });
}

export function assertDirectoryExists(targetPath: string): string {
  const resolvedPath = path.resolve(targetPath);
  if (!fs.existsSync(resolvedPath)) {
    throw new Error(`Target path does not exist: ${resolvedPath}`);
  }

  if (!fs.statSync(resolvedPath).isDirectory()) {
    throw new Error(`Target path is not a directory: ${resolvedPath}`);
  }

  return resolvedPath;
}

export function ensureDirectory(targetPath: string): void {
  fs.mkdirSync(targetPath, { recursive: true });
}

export function readJsonFile<T>(filePath: string): T | null {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
  } catch {
    return null;
  }
}

export function collectProjectFiles(rootPath: string, options: CollectProjectFilesOptions = {}): CollectProjectFilesResult {
  const files: string[] = [];
  const includePatterns = (options.includePatterns ?? []).map(normalizePattern).filter(Boolean);
  const excludePatterns = (options.excludePatterns ?? []).map(normalizePattern).filter(Boolean);
  const maxFiles = options.maxFiles ?? DEFAULT_MAX_FILES;
  const ignoredDirectories = options.ignoredDirectories ?? DEFAULT_IGNORED_DIRECTORIES;
  const reasonTracker = createSkipReasonTracker();
  let skippedFiles = 0;
  let skippedFolders = 0;
  let truncated = false;

  function shouldExcludeDirectory(relativeDirectory: string): boolean {
    if (!relativeDirectory) {
      return false;
    }

    return matchesAnyPattern(relativeDirectory, excludePatterns) || matchesAnyPattern(`${relativeDirectory}/`, excludePatterns);
  }

  function walk(currentPath: string): void {
    const entries = fs.readdirSync(currentPath, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(currentPath, entry.name);
      const relativePath = toRelativePosix(rootPath, fullPath);

      if (entry.isDirectory()) {
        if (ignoredDirectories.has(entry.name)) {
          skippedFolders += 1;
          reasonTracker.add("default ignored folder");
          continue;
        }

        if (shouldExcludeDirectory(relativePath)) {
          skippedFolders += 1;
          reasonTracker.add("excluded by config");
          continue;
        }

        walk(fullPath);
        continue;
      }

      if (includePatterns.length > 0 && !matchesAnyPattern(relativePath, includePatterns)) {
        skippedFiles += 1;
        reasonTracker.add("not matched by include patterns");
        continue;
      }

      if (matchesAnyPattern(relativePath, excludePatterns)) {
        skippedFiles += 1;
        reasonTracker.add("excluded by config");
        continue;
      }

      if (files.length >= maxFiles) {
        skippedFiles += 1;
        truncated = true;
        reasonTracker.add("max files limit reached");
        continue;
      }

      files.push(fullPath);
    }
  }

  walk(rootPath);

  return {
    files,
    skippedFiles,
    skippedFolders,
    skippedReasons: reasonTracker.toArray(),
    truncated,
  };
}

export function toRelativePosix(rootPath: string, filePath: string): string {
  return path.relative(rootPath, filePath).split(path.sep).join("/");
}

export function getMainFolders(relativeFiles: string[]): string[] {
  const topLevelFolders = new Set<string>();
  for (const relativeFile of relativeFiles) {
    const [topLevel] = relativeFile.split("/");
    if (topLevel && topLevel !== relativeFile) {
      topLevelFolders.add(topLevel);
    }
  }

  return [...topLevelFolders].sort();
}

export function findImportantConfigFiles(relativeFiles: string[]): string[] {
  const importantNames = [
    "package.json",
    "package-lock.json",
    "pnpm-workspace.yaml",
    "pnpm-lock.yaml",
    "turbo.json",
    "nx.json",
    "tsconfig.json",
    "tsconfig.base.json",
    "jsconfig.json",
    "pyproject.toml",
    "poetry.lock",
    "requirements.txt",
    "Pipfile",
    "Pipfile.lock",
    "setup.py",
    "setup.cfg",
    "pytest.ini",
    "vite.config.ts",
    "vite.config.js",
    "vite.config.mjs",
    "vite.config.cjs",
    "vitest.config.ts",
    "vitest.config.js",
    "vitest.config.mjs",
    "vitest.config.cjs",
    "next.config.js",
    "next.config.ts",
    "next.config.mjs",
    "nuxt.config.ts",
    "nuxt.config.js",
    "astro.config.ts",
    "astro.config.mjs",
    "angular.json",
    "svelte.config.js",
    "svelte.config.ts",
    "remix.config.js",
    "remix.config.ts",
    "webpack.config.js",
    "webpack.config.ts",
    "tailwind.config.js",
    "tailwind.config.ts",
    "tailwind.config.cjs",
    "postcss.config.js",
    "postcss.config.cjs",
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    ".dockerignore",
    "nginx.conf",
    "pm2.config.js",
    "ecosystem.config.js",
    "ecosystem.config.cjs",
    "prisma/schema.prisma",
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.cjs",
    ".eslintrc.json",
    "eslint.config.js",
    "eslint.config.mjs",
    "eslint.config.cjs",
    ".prettierrc",
    ".prettierrc.json",
    "prettier.config.js",
    "prettier.config.cjs",
    "playwright.config.ts",
    "playwright.config.js",
    "jest.config.js",
    "jest.config.ts",
    "cypress.config.ts",
    "cypress.config.js",
    ".github/workflows/ci.yml",
    ".github/workflows/ci.yaml",
    ".github/workflows/test.yml",
    ".github/workflows/test.yaml",
    "vercel.json",
    "netlify.toml",
    "render.yaml",
    "render.yml",
    "railway.json",
    "railway.toml",
    "reporadar.config.json",
  ];

  const relativeSet = new Set(relativeFiles);
  return importantNames.filter((name) => relativeSet.has(name));
}

export function readTextFileIfSafe(
  filePath: string,
  maxFileSizeKb = DEFAULT_MAX_FILE_SIZE_KB,
  tracker?: SkipReasonTracker,
): string | null {
  const extension = path.extname(filePath).toLowerCase();
  const baseName = path.basename(filePath).toLowerCase();
  const isEnvStyleFile = baseName.startsWith(".env");
  if (isEnvStyleFile) {
    tracker?.add("env file content intentionally skipped");
    return null;
  }

  if (!TEXT_FILE_EXTENSIONS.has(extension) && extension !== "") {
    tracker?.add("unsupported text extension");
    return null;
  }

  const stat = fs.statSync(filePath);
  if (stat.size > maxFileSizeKb * 1024) {
    tracker?.add("file exceeds max size");
    return null;
  }

  try {
    return fs.readFileSync(filePath, "utf8");
  } catch {
    tracker?.add("unreadable text file");
    return null;
  }
}

export function mergeScanSafety(
  base: Omit<ScanSafetyInfo, "skippedReasons"> & { skippedReasons: SkippedReasonSummary[] },
  additions: SkippedReasonSummary[],
): ScanSafetyInfo {
  const counts = new Map<string, number>();

  for (const item of [...base.skippedReasons, ...additions]) {
    counts.set(item.reason, (counts.get(item.reason) ?? 0) + item.count);
  }

  return {
    ...base,
    skippedReasons: [...counts.entries()]
      .map(([reason, count]) => ({ reason, count }))
      .sort((left, right) => right.count - left.count || left.reason.localeCompare(right.reason)),
  };
}

export function writeTextFile(filePath: string, content: string): void {
  fs.writeFileSync(filePath, content, "utf8");
}
