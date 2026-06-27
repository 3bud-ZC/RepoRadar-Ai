import path from "node:path";
import type { ArchitectureImport, ModuleAlias, ModuleBasePath, ModuleResolutionInfo, ScanContext } from "../types/repoFacts";

const JS_TS_EXTENSIONS = [".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"];

interface AliasPattern {
  pattern: string;
  targets: string[];
  source: string;
}

interface ResolvedImportTarget {
  resolvedTarget: string;
  resolutionKind: NonNullable<ArchitectureImport["resolutionKind"]>;
}

interface ModuleResolver {
  aliases: AliasPattern[];
  basePaths: ModuleBasePath[];
  configFiles: string[];
  resolveJsTsImport(sourceFile: string, target: string): ResolvedImportTarget | null;
  summarize(imports: ArchitectureImport[]): ModuleResolutionInfo;
}

function stripJsonComments(input: string): string {
  return input
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "")
    .replace(/,\s*([}\]])/g, "$1");
}

function parseJsonLike<T>(input: string): T | null {
  try {
    return JSON.parse(stripJsonComments(input)) as T;
  } catch {
    return null;
  }
}

function toRepoRelative(rootPath: string, configFile: string, rawTarget: string): string {
  const normalized = rawTarget.replace(/\\/g, "/").trim();
  const configDir = path.posix.dirname(configFile);
  const baseDir = configDir === "." ? "" : configDir;
  const absoluteLike = normalized.startsWith("/") ? normalized.slice(1) : normalized;
  const joined = normalized.startsWith("/")
    ? absoluteLike
    : path.posix.normalize(path.posix.join(baseDir, normalized));
  return path.posix.relative(".", path.posix.normalize(joined));
}

function normalizeAliasTarget(rootPath: string, configFile: string, rawTarget: string, baseUrl: string | null): string {
  const normalized = rawTarget.replace(/\\/g, "/").trim();
  if (normalized.startsWith(".")) {
    return toRepoRelative(rootPath, configFile, normalized);
  }

  if (normalized.startsWith("/")) {
    return normalized.slice(1);
  }

  if (baseUrl) {
    return path.posix.normalize(path.posix.join(baseUrl, normalized));
  }

  return toRepoRelative(rootPath, configFile, normalized);
}

function extractQuotedPath(expression: string): string | null {
  const literalMatch = expression.match(/["'`]((?:\.{0,2}\/)?[^"'`]+)["'`]/);
  if (literalMatch) {
    return literalMatch[1];
  }

  return null;
}

function extractAliasEntriesFromVite(content: string, configFile: string): AliasPattern[] {
  const aliases: AliasPattern[] = [];
  const seen = new Set<string>();
  const addAlias = (pattern: string, rawTarget: string): void => {
    const normalizedPattern = pattern.trim();
    const normalizedTarget = rawTarget.trim();
    const key = `${normalizedPattern}|${normalizedTarget}`;
    if (!normalizedPattern || !normalizedTarget || seen.has(key)) {
      return;
    }

    seen.add(key);
    aliases.push({
      pattern: normalizedPattern,
      targets: [normalizedTarget],
      source: configFile,
    });
  };

  const objectBlockRegex = /alias\s*:\s*{([\s\S]*?)}/g;
  let objectBlockMatch: RegExpExecArray | null;
  while ((objectBlockMatch = objectBlockRegex.exec(content)) !== null) {
    const propertyRegex = /["'`]([^"'`]+)["'`]\s*:\s*([^,\n}]+)/g;
    let propertyMatch: RegExpExecArray | null;
    while ((propertyMatch = propertyRegex.exec(objectBlockMatch[1])) !== null) {
      const rawTarget = extractQuotedPath(propertyMatch[2]);
      if (rawTarget) {
        addAlias(propertyMatch[1], rawTarget);
      }
    }
  }

  const arrayEntryRegex =
    /find\s*:\s*["'`]([^"'`]+)["'`][\s\S]*?replacement\s*:\s*([^,\n}]+(?:\([^)]*\))?[^,\n}]*)/g;
  let arrayEntryMatch: RegExpExecArray | null;
  while ((arrayEntryMatch = arrayEntryRegex.exec(content)) !== null) {
    const rawTarget = extractQuotedPath(arrayEntryMatch[2]);
    if (rawTarget) {
      addAlias(arrayEntryMatch[1], rawTarget);
    }
  }

  return aliases;
}

function extractAliasEntriesFromWebpack(content: string, configFile: string): AliasPattern[] {
  const aliases: AliasPattern[] = [];
  const aliasBlockRegex = /alias\s*:\s*{([\s\S]*?)}/g;
  let blockMatch: RegExpExecArray | null;
  while ((blockMatch = aliasBlockRegex.exec(content)) !== null) {
    const propertyRegex = /["'`]([^"'`]+)["'`]\s*:\s*([^,\n}]+)/g;
    let propertyMatch: RegExpExecArray | null;
    while ((propertyMatch = propertyRegex.exec(blockMatch[1])) !== null) {
      const rawTarget = extractQuotedPath(propertyMatch[2]);
      if (!rawTarget) {
        continue;
      }

      aliases.push({
        pattern: propertyMatch[1],
        targets: [rawTarget],
        source: configFile,
      });
    }
  }

  return aliases;
}

function loadAliasPatterns(context: ScanContext): { aliases: AliasPattern[]; basePaths: ModuleBasePath[]; configFiles: string[] } {
  const aliases: AliasPattern[] = [];
  const basePaths: ModuleBasePath[] = [];
  const configFiles = new Set<string>();

  for (const configFile of context.relativeFiles) {
    const content = context.fileContentCache.get(configFile);
    if (!content) {
      continue;
    }

    if (/(^|\/)(tsconfig(?:\.[^/]+)?|jsconfig)\.json$/.test(configFile)) {
      const parsed = parseJsonLike<{
        compilerOptions?: {
          baseUrl?: string;
          paths?: Record<string, string[]>;
        };
      }>(content);
      const compilerOptions = parsed?.compilerOptions;
      if (!compilerOptions) {
        continue;
      }

      configFiles.add(configFile);
      const configDir = path.posix.dirname(configFile);
      const rawBaseUrl = compilerOptions.baseUrl?.trim() ?? "";
      const normalizedBaseUrl = rawBaseUrl
        ? normalizeAliasTarget(context.rootPath, configFile, rawBaseUrl, null)
        : configDir === "."
          ? ""
          : configDir;

      if (rawBaseUrl || configDir !== ".") {
        basePaths.push({
          path: normalizedBaseUrl,
          source: configFile,
        });
      }

      for (const [pattern, targets] of Object.entries(compilerOptions.paths ?? {})) {
        if (!Array.isArray(targets) || targets.length === 0) {
          continue;
        }

        const normalizedTargets = targets
          .filter((target): target is string => typeof target === "string" && target.trim().length > 0)
          .map((target) => normalizeAliasTarget(context.rootPath, configFile, target, rawBaseUrl ? normalizedBaseUrl : null));

        if (normalizedTargets.length === 0) {
          continue;
        }

        aliases.push({
          pattern,
          targets: normalizedTargets,
          source: configFile,
        });
      }
    }

    if (/^(vite\.config|vitest\.config)\.(ts|js|mjs|cjs)$/.test(path.posix.basename(configFile))) {
      const viteAliases = extractAliasEntriesFromVite(content, configFile).map((entry) => ({
        ...entry,
        targets: entry.targets.map((target) => normalizeAliasTarget(context.rootPath, configFile, target, null)),
      }));
      if (viteAliases.length > 0) {
        configFiles.add(configFile);
        aliases.push(...viteAliases);
      }
    }

    if (/^webpack\.config\.(ts|js|mjs|cjs)$/.test(path.posix.basename(configFile))) {
      const webpackAliases = extractAliasEntriesFromWebpack(content, configFile).map((entry) => ({
        ...entry,
        targets: entry.targets.map((target) => normalizeAliasTarget(context.rootPath, configFile, target, null)),
      }));
      if (webpackAliases.length > 0) {
        configFiles.add(configFile);
        aliases.push(...webpackAliases);
      }
    }
  }

  if (context.packageJson && typeof (context.packageJson as { imports?: unknown }).imports === "object") {
    const importsField = (context.packageJson as { imports?: Record<string, string> }).imports ?? {};
    for (const [pattern, target] of Object.entries(importsField)) {
      if (typeof target !== "string" || !target.startsWith(".")) {
        continue;
      }

      configFiles.add("package.json");
      aliases.push({
        pattern,
        targets: [normalizeAliasTarget(context.rootPath, "package.json", target, null)],
        source: "package.json",
      });
    }
  }

  const dedupedAliases = new Map<string, AliasPattern>();
  for (const alias of aliases) {
    const key = `${alias.pattern}|${alias.targets.join("|")}|${alias.source}`;
    if (!dedupedAliases.has(key)) {
      dedupedAliases.set(key, alias);
    }
  }

  const dedupedBasePaths = new Map<string, ModuleBasePath>();
  for (const basePath of basePaths) {
    const key = `${basePath.path}|${basePath.source}`;
    if (!dedupedBasePaths.has(key)) {
      dedupedBasePaths.set(key, basePath);
    }
  }

  return {
    aliases: [...dedupedAliases.values()].sort((left, right) => left.pattern.localeCompare(right.pattern) || left.source.localeCompare(right.source)),
    basePaths: [...dedupedBasePaths.values()].sort((left, right) => left.path.localeCompare(right.path) || left.source.localeCompare(right.source)),
    configFiles: [...configFiles].sort(),
  };
}

function matchAliasPattern(pattern: string, target: string): { remainder: string; wildcardValue: string } | null {
  if (pattern.includes("*")) {
    const [prefix, suffix] = pattern.split("*");
    if (!target.startsWith(prefix) || !target.endsWith(suffix)) {
      return null;
    }

    const wildcardValue = target.slice(prefix.length, target.length - suffix.length);
    return {
      remainder: wildcardValue,
      wildcardValue,
    };
  }

  if (target === pattern) {
    return { remainder: "", wildcardValue: "" };
  }

  if (target.startsWith(`${pattern}/`)) {
    const remainder = target.slice(pattern.length + 1);
    return { remainder, wildcardValue: remainder };
  }

  return null;
}

function appendImportRemainder(baseTarget: string, remainder: string, pattern: string): string {
  if (!remainder) {
    return baseTarget;
  }

  if (baseTarget.includes("*")) {
    return baseTarget.replace("*", remainder);
  }

  if (pattern.includes("*")) {
    return baseTarget;
  }

  return `${baseTarget.replace(/\/$/, "")}/${remainder}`;
}

function resolveFileCandidates(baseTarget: string, fileSet: Set<string>): string | null {
  const candidates = new Set<string>();
  const normalizedBase = path.posix.normalize(baseTarget);
  candidates.add(normalizedBase);
  for (const extension of JS_TS_EXTENSIONS) {
    candidates.add(`${normalizedBase}${extension}`);
    candidates.add(`${normalizedBase}/index${extension}`);
  }

  for (const candidate of candidates) {
    if (fileSet.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

export function createModuleResolver(context: ScanContext): ModuleResolver {
  const fileSet = new Set(context.relativeFiles);
  const { aliases, basePaths, configFiles } = loadAliasPatterns(context);

  function resolveRelativeLike(sourceFile: string, target: string): ResolvedImportTarget | null {
    const normalizedTarget = target.replace(/\\/g, "/");
    let baseTarget = normalizedTarget;
    let resolutionKind: ResolvedImportTarget["resolutionKind"] = "relative";

    if (normalizedTarget.startsWith("./") || normalizedTarget.startsWith("../")) {
      baseTarget = path.posix.normalize(path.posix.join(path.posix.dirname(sourceFile), normalizedTarget));
      resolutionKind = "relative";
    } else if (normalizedTarget.startsWith("/")) {
      baseTarget = normalizedTarget.slice(1);
      resolutionKind = "root";
    } else if (normalizedTarget.startsWith("~/")) {
      baseTarget = normalizedTarget.slice(2);
      resolutionKind = "root";
    } else if (normalizedTarget.startsWith("@/")) {
      baseTarget = `src/${normalizedTarget.slice(2)}`;
      resolutionKind = "alias";
    } else {
      return null;
    }

    const resolvedTarget = resolveFileCandidates(baseTarget, fileSet);
    if (!resolvedTarget) {
      return null;
    }

    return { resolvedTarget, resolutionKind };
  }

  function resolveAliasLike(target: string): ResolvedImportTarget | null {
    for (const alias of aliases) {
      const matched = matchAliasPattern(alias.pattern, target);
      if (!matched) {
        continue;
      }

      for (const aliasTarget of alias.targets) {
        const baseTarget = appendImportRemainder(aliasTarget, matched.remainder, alias.pattern);
        const resolvedTarget = resolveFileCandidates(baseTarget, fileSet);
        if (resolvedTarget) {
          return {
            resolvedTarget,
            resolutionKind: "alias",
          };
        }
      }
    }

    return null;
  }

  function resolveBaseUrlLike(target: string): ResolvedImportTarget | null {
    for (const basePath of basePaths) {
      const candidateTarget = basePath.path ? `${basePath.path.replace(/\/$/, "")}/${target}` : target;
      const resolvedTarget = resolveFileCandidates(candidateTarget, fileSet);
      if (resolvedTarget) {
        return {
          resolvedTarget,
          resolutionKind: "baseUrl",
        };
      }
    }

    return null;
  }

  return {
    aliases,
    basePaths,
    configFiles,
    resolveJsTsImport(sourceFile: string, target: string): ResolvedImportTarget | null {
      return resolveRelativeLike(sourceFile, target) ?? resolveAliasLike(target) ?? resolveBaseUrlLike(target);
    },
    summarize(imports: ArchitectureImport[]): ModuleResolutionInfo {
      const internalImports = imports.filter((item) => item.internal);
      const aliasResolvedImports = internalImports.filter((item) => item.resolutionKind === "alias").length;
      const relativeResolvedImports = internalImports.filter((item) => item.resolutionKind === "relative").length;
      const baseUrlResolvedImports = internalImports.filter((item) => item.resolutionKind === "baseUrl").length;
      const rootResolvedImports = internalImports.filter((item) => item.resolutionKind === "root").length;
      const resolvedInternalImports = internalImports.filter((item) => item.resolvedTarget).length;
      const unresolvedInternalImports = internalImports.length - resolvedInternalImports;
      const notes = [
        `Detected ${aliases.length} alias pattern(s) from ${configFiles.length} config file(s).`,
        `Resolved ${resolvedInternalImports} internal import(s); ${unresolvedInternalImports} remained unresolved.`,
      ];

      if (basePaths.length > 0) {
        notes.push(`Detected ${basePaths.length} base path hint(s) from tsconfig/jsconfig.`);
      }
      if (aliasResolvedImports > 0) {
        notes.push(`Resolved ${aliasResolvedImports} import(s) through alias mappings.`);
      }
      if (baseUrlResolvedImports > 0) {
        notes.push(`Resolved ${baseUrlResolvedImports} import(s) through baseUrl-style absolute paths.`);
      }
      if (rootResolvedImports > 0) {
        notes.push(`Resolved ${rootResolvedImports} import(s) through root-style hints such as "@/..." or "~/...".`);
      }

      return {
        aliases: aliases.map((alias): ModuleAlias => ({
          pattern: alias.pattern,
          targets: alias.targets,
          source: alias.source,
        })),
        basePaths,
        configFiles,
        resolvedInternalImports,
        unresolvedInternalImports,
        aliasResolvedImports,
        relativeResolvedImports,
        baseUrlResolvedImports,
        notes,
      };
    },
  };
}
