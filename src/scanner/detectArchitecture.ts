import path from "node:path";
import type {
  ArchitectureDataModel,
  ArchitectureEntrypoint,
  ArchitectureEnvUsage,
  ArchitectureImport,
  ArchitectureImportantFile,
  ArchitectureInfo,
  ArchitectureLayer,
  ArchitecturePackageRelationship,
  ArchitectureRoute,
  DependencyGraphCycleHint,
  DependencyGraphEdge,
  DependencyGraphFileCount,
  DependencyGraphInfo,
  DependencyGraphPackageCount,
  MonorepoInfo,
  MonorepoPackageGraph,
  PackageSummary,
  ProjectType,
  ScanContext,
} from "../types/repoFacts";
import { createModuleResolver } from "./moduleResolution";

interface ArchitectureInputs {
  detectedFrameworks: string[];
  projectType: ProjectType;
  monorepo: MonorepoInfo;
  packageSummary: PackageSummary;
}

interface PackageManifestInfo {
  name: string;
  root: string;
}

const JS_TS_EXTENSIONS = new Set([".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"]);
const PYTHON_EXTENSIONS = new Set([".py"]);
const HEALTH_ROUTE_HINTS = new Set(["/health", "/api/health", "/status", "/ready", "/live"]);

function uniqueByFileAndKind<T extends { file: string; kind?: string; path?: string; name?: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    const key = `${item.file}|${item.kind ?? ""}|${item.path ?? ""}|${item.name ?? ""}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function getContent(context: ScanContext, relativePath: string): string {
  return context.fileContentCache.get(relativePath) ?? "";
}

function parsePackageManifests(context: ScanContext): PackageManifestInfo[] {
  const manifests: PackageManifestInfo[] = [];

  for (const [relativePath, content] of context.fileContentCache.entries()) {
    if (!relativePath.endsWith("package.json")) {
      continue;
    }

    try {
      const parsed = JSON.parse(content) as { name?: string };
      if (!parsed.name) {
        continue;
      }

      manifests.push({
        name: parsed.name,
        root: path.posix.dirname(relativePath) === "." ? "" : path.posix.dirname(relativePath),
      });
    } catch {
      continue;
    }
  }

  return manifests.sort((left, right) => right.root.length - left.root.length || left.name.localeCompare(right.name));
}

function guessScriptFile(command: string): string | null {
  const normalized = command.replace(/\\/g, "/");
  const pathMatch = normalized.match(/([A-Za-z0-9_./-]+\.(?:ts|tsx|js|jsx|mjs|cjs|py))/);
  if (pathMatch) {
    return pathMatch[1].replace(/^\.\//, "");
  }

  const uvicornMatch = normalized.match(/([A-Za-z0-9_./]+):[A-Za-z0-9_]+/);
  if (uvicornMatch) {
    return `${uvicornMatch[1].replace(/\./g, "/")}.py`;
  }

  return null;
}

function detectEntrypoints(context: ScanContext): ArchitectureEntrypoint[] {
  const entrypoints: ArchitectureEntrypoint[] = [];
  const packageJson = context.packageJson;
  const scripts = packageJson?.scripts ?? {};
  const commonFiles: Array<{ file: string; kind: string; reason: string; confidence: number }> = [
    { file: "src/index.ts", kind: "code", reason: "Common source entrypoint file.", confidence: 0.95 },
    { file: "src/index.js", kind: "code", reason: "Common source entrypoint file.", confidence: 0.95 },
    { file: "src/main.ts", kind: "code", reason: "Common main module entrypoint.", confidence: 0.95 },
    { file: "src/main.tsx", kind: "frontend", reason: "Common frontend bootstrap entrypoint.", confidence: 0.95 },
    { file: "src/App.tsx", kind: "frontend", reason: "Common React application shell entrypoint.", confidence: 0.85 },
    { file: "src/server.ts", kind: "server", reason: "Common backend server entrypoint.", confidence: 0.95 },
    { file: "src/server.js", kind: "server", reason: "Common backend server entrypoint.", confidence: 0.95 },
    { file: "src/app.ts", kind: "server", reason: "Common application bootstrap file.", confidence: 0.9 },
    { file: "src/app.js", kind: "server", reason: "Common application bootstrap file.", confidence: 0.9 },
    { file: "server/index.ts", kind: "server", reason: "Common backend server entrypoint.", confidence: 0.95 },
    { file: "pages/_app.tsx", kind: "next-pages", reason: "Next.js pages router root app file.", confidence: 0.95 },
    { file: "app/page.tsx", kind: "next-app", reason: "Next.js app router root page file.", confidence: 0.95 },
    { file: "app/layout.tsx", kind: "next-app", reason: "Next.js app router root layout file.", confidence: 0.95 },
    { file: "app.vue", kind: "vue-app", reason: "Vue application shell entrypoint.", confidence: 0.9 },
    { file: "src/main.py", kind: "python", reason: "Common Python module entrypoint.", confidence: 0.9 },
    { file: "main.py", kind: "python", reason: "Common Python application entrypoint.", confidence: 0.95 },
    { file: "app.py", kind: "python", reason: "Common Python application entrypoint.", confidence: 0.95 },
    { file: "manage.py", kind: "python", reason: "Common Django management entrypoint.", confidence: 0.95 },
  ];

  for (const field of ["main", "module"] as const) {
    const value = packageJson?.[field];
    if (typeof value === "string" && context.relativeFiles.includes(value.replace(/\\/g, "/"))) {
      entrypoints.push({
        file: value.replace(/\\/g, "/"),
        kind: `package-json-${field}`,
        reason: `Detected from package.json \`${field}\` field.`,
        confidence: 1,
      });
    }
  }

  if (packageJson?.bin) {
    if (typeof packageJson.bin === "string") {
      entrypoints.push({
        file: packageJson.bin.replace(/\\/g, "/"),
        kind: "package-json-bin",
        reason: "Detected from package.json `bin` field.",
        confidence: 1,
      });
    } else {
      for (const target of Object.values(packageJson.bin)) {
        entrypoints.push({
          file: target.replace(/\\/g, "/"),
          kind: "package-json-bin",
          reason: "Detected from package.json `bin` field.",
          confidence: 1,
        });
      }
    }
  }

  for (const [scriptName, command] of Object.entries(scripts)) {
    if (!["dev", "start", "build", "preview"].includes(scriptName)) {
      continue;
    }

    const detectedFile = guessScriptFile(command);
    if (detectedFile && context.relativeFiles.includes(detectedFile)) {
      entrypoints.push({
        file: detectedFile,
        kind: `script-${scriptName}`,
        reason: `Detected from package.json \`${scriptName}\` script.`,
        confidence: 0.9,
      });
    }
  }

  for (const candidate of commonFiles) {
    if (context.relativeFiles.includes(candidate.file)) {
      entrypoints.push(candidate);
    }
  }

  for (const relativeFile of context.relativeFiles) {
    if (relativeFile.endsWith("/__main__.py")) {
      entrypoints.push({
        file: relativeFile,
        kind: "python-module",
        reason: "Python module entrypoint detected through __main__.py.",
        confidence: 0.95,
      });
    }
  }

  for (const [relativePath, content] of context.fileContentCache.entries()) {
    if (!relativePath.endsWith(".py")) {
      continue;
    }

    if (/=\s*FastAPI\(/.test(content)) {
      entrypoints.push({
        file: relativePath,
        kind: "fastapi-app",
        reason: "FastAPI app instance detected in file.",
        confidence: 0.9,
      });
    }

    if (/=\s*Flask\(/.test(content)) {
      entrypoints.push({
        file: relativePath,
        kind: "flask-app",
        reason: "Flask app instance detected in file.",
        confidence: 0.9,
      });
    }

    if (/@Controller\(/.test(content)) {
      entrypoints.push({
        file: relativePath,
        kind: "nestjs-controller",
        reason: "NestJS controller detected in file.",
        confidence: 0.8,
      });
    }

    if (/streamlit/.test(content) || /st\./.test(content)) {
      entrypoints.push({
        file: relativePath,
        kind: "streamlit-app",
        reason: "Streamlit app hints detected in file.",
        confidence: 0.75,
      });
    }
  }

  return uniqueByFileAndKind(entrypoints).filter((entrypoint) => context.relativeFiles.includes(entrypoint.file));
}

function normalizeRouteParam(segment: string): string {
  if (segment === "index" || segment === "_index" || segment === "+page" || segment === "+layout") {
    return "";
  }

  return segment
    .replace(/^\((.*)\)$/, "$1")
    .replace(/\[\.\.\.([^\]]+)\]/g, ":$1*")
    .replace(/\[\[\.{3}([^\]]+)\]\]/g, ":$1*")
    .replace(/\[([^\]]+)\]/g, ":$1")
    .replace(/\$([A-Za-z0-9_]+)/g, ":$1")
    .replace(/^_/, "");
}

function joinRouteParts(parts: string[]): string {
  const normalized = parts.map(normalizeRouteParam).filter(Boolean);
  return normalized.length === 0 ? "/" : `/${normalized.join("/")}`;
}

function inferJsRouterSource(content: string): string {
  if (/from\s+["']fastify["']/.test(content)) return "Fastify";
  if (/from\s+["'](?:@koa\/router|koa-router)["']/.test(content)) return "Koa Router";
  if (/from\s+["']hono["']/.test(content)) return "Hono";
  if (/from\s+["']express["']/.test(content) || /require\(["']express["']\)/.test(content)) return "Express";
  return "JS Router";
}

function detectJsRouterRoutes(relativePath: string, content: string): ArchitectureRoute[] {
  const routes: ArchitectureRoute[] = [];
  const source = inferJsRouterSource(content);
  const simpleRegex = /\b(?:app|router|server|fastify)\.(get|post|put|delete|patch|options|head)\(\s*["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = simpleRegex.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      file: relativePath,
      source,
      confidence: 0.95,
    });
  }

  const routeObjectRegex =
    /\b(?:app|server|fastify)\.route\(\s*{[\s\S]*?method\s*:\s*["'`]?(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)["'`]?\s*,?[\s\S]*?(?:url|path)\s*:\s*["'`]([^"'`]+)["'`]/g;
  while ((match = routeObjectRegex.exec(content)) !== null) {
    routes.push({
      method: match[1].toUpperCase(),
      path: match[2],
      file: relativePath,
      source,
      confidence: 0.9,
    });
  }

  return routes;
}

function pagesFileToRoute(relativePath: string): string | null {
  if (!relativePath.startsWith("pages/") || !/\.(tsx|ts|jsx|js|mdx)$/.test(relativePath)) {
    return null;
  }

  const routePath = relativePath
    .replace(/^pages/, "")
    .replace(/\.(tsx|ts|jsx|js|mdx)$/, "")
    .replace(/\/index$/, "/");

  return routePath === "" ? "/" : routePath;
}

function appRouterFileToRoute(relativePath: string): string | null {
  if (!relativePath.startsWith("app/")) {
    return null;
  }

  if (/(^|\/)page\.(tsx|ts|jsx|js|mdx)$/.test(relativePath)) {
    const routePath = relativePath.replace(/^app/, "").replace(/\/page\.(tsx|ts|jsx|js|mdx)$/, "");
    return routePath === "" ? "/" : routePath;
  }

  if (/(^|\/)route\.(tsx|ts|jsx|js)$/.test(relativePath)) {
    return relativePath.replace(/^app/, "").replace(/\/route\.(tsx|ts|jsx|js)$/, "") || "/";
  }

  return null;
}

function remixRouteFileToRoute(relativePath: string): string | null {
  if (!relativePath.startsWith("app/routes/")) {
    return null;
  }

  const trimmed = relativePath.replace(/^app\/routes\//, "").replace(/\.(tsx|ts|jsx|js|mdx)$/, "");
  const parts = trimmed.split("/").flatMap((segment) => segment.split("."));
  return joinRouteParts(parts);
}

function astroPageFileToRoute(relativePath: string): string | null {
  if (!relativePath.startsWith("src/pages/")) {
    return null;
  }

  const trimmed = relativePath.replace(/^src\/pages\//, "").replace(/\.(astro|md|mdx|tsx|ts|jsx|js)$/, "");
  return joinRouteParts(trimmed.split("/"));
}

function svelteKitFileToRoute(relativePath: string): string | null {
  if (!relativePath.startsWith("src/routes/")) {
    return null;
  }

  if (!/(^|\/)\+(page|server)\.(svelte|ts|js)$/.test(relativePath)) {
    return null;
  }

  const trimmed = relativePath
    .replace(/^src\/routes\//, "")
    .replace(/(^|\/)\+(page|server)\.(svelte|ts|js)$/, "");
  return joinRouteParts(trimmed ? trimmed.split("/") : []);
}

function detectFileBasedRoutes(context: ScanContext): ArchitectureRoute[] {
  const routes: ArchitectureRoute[] = [];

  for (const relativePath of context.relativeFiles) {
    if (relativePath.startsWith("pages/")) {
      const routePath = pagesFileToRoute(relativePath);
      if (routePath) {
        routes.push({
          method: relativePath.startsWith("pages/api/") ? null : "GET",
          path: routePath,
          file: relativePath,
          source: relativePath.startsWith("pages/api/") ? "Next.js Pages API" : "Next.js Pages Router",
          confidence: 0.9,
        });
        continue;
      }
    }

    if (relativePath.startsWith("app/")) {
      const routePath = appRouterFileToRoute(relativePath);
      if (routePath) {
        let method: string | null = "GET";
        let source = "Next.js App Router";
        if (relativePath.includes("/api/") || relativePath.startsWith("app/api/") || /\/route\./.test(relativePath)) {
          method = null;
          source = "Next.js App Router API";
          const methodMatch = getContent(context, relativePath).match(/\bexport\s+(?:async\s+)?function\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/);
          if (methodMatch) {
            method = methodMatch[1];
          }
        }

        routes.push({
          method,
          path: routePath,
          file: relativePath,
          source,
          confidence: 0.9,
        });
        continue;
      }
    }

    const remixRoute = remixRouteFileToRoute(relativePath);
    if (remixRoute) {
      routes.push({
        method: relativePath.includes("api.") ? null : "GET",
        path: remixRoute,
        file: relativePath,
        source: "Remix Routes",
        confidence: 0.85,
      });
      continue;
    }

    const astroRoute = astroPageFileToRoute(relativePath);
    if (astroRoute) {
      routes.push({
        method: relativePath.includes("/api/") ? null : "GET",
        path: astroRoute,
        file: relativePath,
        source: "Astro Pages",
        confidence: 0.8,
      });
      continue;
    }

    const svelteKitRoute = svelteKitFileToRoute(relativePath);
    if (svelteKitRoute) {
      let method: string | null = relativePath.endsWith("+server.ts") || relativePath.endsWith("+server.js") ? null : "GET";
      if (method === null) {
        const methodMatch = getContent(context, relativePath).match(/\bexport\s+const\s+(GET|POST|PUT|DELETE|PATCH|OPTIONS|HEAD)\b/);
        if (methodMatch) {
          method = methodMatch[1];
        }
      }

      routes.push({
        method,
        path: svelteKitRoute,
        file: relativePath,
        source: "SvelteKit Routes",
        confidence: 0.85,
      });
    }
  }

  return routes;
}

function detectReactRouterRoutes(relativePath: string, content: string): ArchitectureRoute[] {
  const routes: ArchitectureRoute[] = [];
  const jsxRegex = /<Route[^>]*path=["'`]([^"'`]+)["'`]/g;
  const arrayRegex = /\bpath\s*:\s*["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;

  while ((match = jsxRegex.exec(content)) !== null) {
    routes.push({
      method: null,
      path: match[1],
      file: relativePath,
      source: "React Router JSX",
      confidence: 0.8,
    });
  }

  if (content.includes("react-router") || content.includes("createBrowserRouter") || content.includes("<Route") || content.includes("path:")) {
    while ((match = arrayRegex.exec(content)) !== null) {
      routes.push({
        method: null,
        path: match[1],
        file: relativePath,
        source: "React Router Config",
        confidence: 0.7,
      });
    }
  }

  return routes;
}

function detectVueRouterRoutes(relativePath: string, content: string): ArchitectureRoute[] {
  if (!content.includes("vue-router") && !content.includes("createRouter")) {
    return [];
  }

  const routes: ArchitectureRoute[] = [];
  const routeRegex = /\bpath\s*:\s*["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push({
      method: null,
      path: match[1],
      file: relativePath,
      source: "Vue Router",
      confidence: 0.75,
    });
  }

  return routes;
}

function detectAngularRoutes(relativePath: string, content: string): ArchitectureRoute[] {
  if (!content.includes("@angular/router") && !content.includes("Routes")) {
    return [];
  }

  const routes: ArchitectureRoute[] = [];
  const routeRegex = /\bpath\s*:\s*["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = routeRegex.exec(content)) !== null) {
    routes.push({
      method: null,
      path: match[1],
      file: relativePath,
      source: "Angular Router",
      confidence: 0.7,
    });
  }

  return routes;
}

function detectFastApiRoutes(relativePath: string, content: string): ArchitectureRoute[] {
  const routes: ArchitectureRoute[] = [];
  const regex = /@(app|router)\.(get|post|put|delete|patch|options|head)\(\s*["']([^"']+)["']/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    routes.push({
      method: match[2].toUpperCase(),
      path: match[3],
      file: relativePath,
      source: "FastAPI",
      confidence: 0.95,
    });
  }
  return routes;
}

function detectFlaskRoutes(relativePath: string, content: string): ArchitectureRoute[] {
  const routes: ArchitectureRoute[] = [];
  const regex = /@([A-Za-z_][A-Za-z0-9_]*)\.route\(\s*["']([^"']+)["']([^)]*)\)/g;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    const methodsMatch = match[3].match(/methods\s*=\s*\[([^\]]+)\]/);
    const methods = methodsMatch
      ? methodsMatch[1]
          .split(",")
          .map((value) => value.replace(/["'\s]/g, ""))
          .filter(Boolean)
      : ["GET"];
    routes.push({
      method: methods.join(","),
      path: match[2],
      file: relativePath,
      source: "Flask",
      confidence: 0.9,
    });
  }
  return routes;
}

function detectDjangoRoutes(relativePath: string, content: string): ArchitectureRoute[] {
  if (!relativePath.endsWith("urls.py")) {
    return [];
  }

  const routes: ArchitectureRoute[] = [];
  const pathRegex = /\b(?:path|re_path)\(\s*(?:r)?["'`]([^"'`]+)["'`]/g;
  let match: RegExpExecArray | null;
  while ((match = pathRegex.exec(content)) !== null) {
    routes.push({
      method: null,
      path: match[1].startsWith("/") ? match[1] : `/${match[1]}`.replace(/\/+$/, "/"),
      file: relativePath,
      source: "Django URLs",
      confidence: 0.8,
    });
  }

  return routes;
}

function detectNestJsRoutes(relativePath: string, content: string): ArchitectureRoute[] {
  if (!content.includes("@Controller")) {
    return [];
  }

  const routes: ArchitectureRoute[] = [];
  const prefixMatch = content.match(/@Controller\(([^)]*)\)/);
  const controllerPathMatch = prefixMatch?.[1].match(/["'`]([^"'`]*)["'`]/);
  const prefix = controllerPathMatch?.[1] ?? "";
  const methodRegex = /@(Get|Post|Put|Delete|Patch|Options|Head)\(([^)]*)\)/g;
  let methodMatch: RegExpExecArray | null;
  while ((methodMatch = methodRegex.exec(content)) !== null) {
    const routeMatch = methodMatch[2].match(/["'`]([^"'`]*)["'`]/);
    const routePath = joinRouteParts([prefix, routeMatch?.[1] ?? ""]);
    routes.push({
      method: methodMatch[1].toUpperCase(),
      path: routePath,
      file: relativePath,
      source: "NestJS Controller",
      confidence: 0.85,
    });
  }

  return routes;
}

function detectRoutes(context: ScanContext): ArchitectureRoute[] {
  const routes: ArchitectureRoute[] = [];

  for (const [relativePath, content] of context.fileContentCache.entries()) {
    const extension = path.extname(relativePath);
    if (JS_TS_EXTENSIONS.has(extension)) {
      routes.push(...detectJsRouterRoutes(relativePath, content));
      routes.push(...detectReactRouterRoutes(relativePath, content));
      routes.push(...detectVueRouterRoutes(relativePath, content));
      routes.push(...detectAngularRoutes(relativePath, content));
      routes.push(...detectNestJsRoutes(relativePath, content));
    }

    if (PYTHON_EXTENSIONS.has(extension)) {
      routes.push(...detectFastApiRoutes(relativePath, content));
      routes.push(...detectFlaskRoutes(relativePath, content));
      routes.push(...detectDjangoRoutes(relativePath, content));
    }
  }

  routes.push(...detectFileBasedRoutes(context));

  return routes.filter(
    (route, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.file === route.file &&
          candidate.path === route.path &&
          candidate.method === route.method &&
          candidate.source === route.source,
      ) === index,
  );
}

function looksLikeExplicitInternalImport(target: string): boolean {
  return target.startsWith(".") || target.startsWith("/") || target.startsWith("~/") || target.startsWith("@/");
}

function detectImports(context: ScanContext): ArchitectureImport[] {
  const imports: ArchitectureImport[] = [];
  const moduleResolver = createModuleResolver(context);

  for (const [relativePath, content] of context.fileContentCache.entries()) {
    const extension = path.extname(relativePath);

    if (JS_TS_EXTENSIONS.has(extension)) {
      const patterns: Array<{ regex: RegExp; kind: ArchitectureImport["kind"] }> = [
        { regex: /\bimport\s+[^"'`]*?\sfrom\s+["'`]([^"'`]+)["'`]/g, kind: "import" },
        { regex: /\brequire\(\s*["'`]([^"'`]+)["'`]\s*\)/g, kind: "require" },
        { regex: /\bexport\s+[^"'`]*?\sfrom\s+["'`]([^"'`]+)["'`]/g, kind: "export-from" },
      ];

      for (const pattern of patterns) {
        let match: RegExpExecArray | null;
        while ((match = pattern.regex.exec(content)) !== null) {
          const target = match[1];
          const resolved = moduleResolver.resolveJsTsImport(relativePath, target);
          const aliasLike = moduleResolver.aliases.some((alias) => target === alias.pattern || target.startsWith(`${alias.pattern.replace(/\*$/, "")}`));
          imports.push({
            file: relativePath,
            target,
            kind: pattern.kind,
            internal: Boolean(resolved) || looksLikeExplicitInternalImport(target) || aliasLike,
            resolvedTarget: resolved?.resolvedTarget,
            resolutionKind: resolved?.resolutionKind,
          });
        }
      }
    }

    if (PYTHON_EXTENSIONS.has(extension)) {
      const importRegex = /^\s*import\s+([A-Za-z0-9_.,\s]+)/gm;
      const fromRegex = /^\s*from\s+([A-Za-z0-9_.]+|\.+[A-Za-z0-9_.]*)\s+import\s+/gm;
      let match: RegExpExecArray | null;

      while ((match = importRegex.exec(content)) !== null) {
        const targets = match[1].split(",").map((value) => value.trim()).filter(Boolean);
        for (const target of targets) {
          const resolvedTarget = resolvePythonInternalTarget(relativePath, target, new Set(context.relativeFiles));
          imports.push({
            file: relativePath,
            target,
            kind: "python-import",
            internal: Boolean(resolvedTarget),
            resolvedTarget: resolvedTarget ?? undefined,
            resolutionKind: resolvedTarget ? "python-module" : undefined,
          });
        }
      }

      while ((match = fromRegex.exec(content)) !== null) {
        const target = match[1];
        const resolvedTarget = resolvePythonInternalTarget(relativePath, target, new Set(context.relativeFiles));
        imports.push({
          file: relativePath,
          target,
          kind: "python-from-import",
          internal: Boolean(resolvedTarget) || target.startsWith("."),
          resolvedTarget: resolvedTarget ?? undefined,
          resolutionKind: resolvedTarget ? (target.startsWith(".") ? "python-relative" : "python-module") : undefined,
        });
      }
    }
  }

  return imports.filter(
    (item, index, all) =>
      all.findIndex(
        (candidate) =>
          candidate.file === item.file &&
          candidate.target === item.target &&
          candidate.kind === item.kind &&
          candidate.internal === item.internal &&
          candidate.resolvedTarget === item.resolvedTarget,
      ) === index,
  );
}

function findOwningPackage(relativePath: string, manifests: PackageManifestInfo[]): PackageManifestInfo | null {
  for (const manifest of manifests) {
    if (manifest.root === "") {
      continue;
    }

    if (relativePath === manifest.root || relativePath.startsWith(`${manifest.root}/`)) {
      return manifest;
    }
  }

  return null;
}

function detectPackageRelationships(
  imports: ArchitectureImport[],
  manifests: PackageManifestInfo[],
): ArchitecturePackageRelationship[] {
  const relationshipMap = new Map<string, ArchitecturePackageRelationship>();

  for (const item of imports) {
    const sourcePackage = findOwningPackage(item.file, manifests);
    if (!sourcePackage) {
      continue;
    }

    const matchedTarget = manifests.find(
      (manifest) => manifest.name !== sourcePackage.name && (item.target === manifest.name || item.target.startsWith(`${manifest.name}/`)),
    );
    if (!matchedTarget) {
      continue;
    }

    const key = `${sourcePackage.name}|${matchedTarget.name}`;
    const existing = relationshipMap.get(key);
    if (existing) {
      existing.importCount += 1;
      if (item.file < existing.file) {
        existing.file = item.file;
      }
      continue;
    }

    relationshipMap.set(key, {
      fromPackage: sourcePackage.name,
      toPackage: matchedTarget.name,
      sourcePackage: sourcePackage.name,
      targetPackage: matchedTarget.name,
      sourcePath: sourcePackage.root,
      targetPath: matchedTarget.root,
      file: item.file,
      importCount: 1,
      confidence: 0.9,
    });
  }

  return [...relationshipMap.values()].sort(
    (left, right) =>
      right.importCount - left.importCount ||
      left.fromPackage.localeCompare(right.fromPackage) ||
      left.toPackage.localeCompare(right.toPackage),
  );
}

function layerMapHasFile(layerMap: Map<ArchitectureLayer["name"], Set<string>>, file: string): boolean {
  for (const files of layerMap.values()) {
    if (files.has(file)) {
      return true;
    }
  }
  return false;
}

function detectLayers(
  context: ScanContext,
  inputs: ArchitectureInputs,
  routes: ArchitectureRoute[],
  entrypoints: ArchitectureEntrypoint[],
): ArchitectureLayer[] {
  const layerMap = new Map<ArchitectureLayer["name"], Set<string>>();
  const routeFiles = new Set(routes.map((route) => route.file));
  const entrypointFiles = new Set(entrypoints.map((entrypoint) => entrypoint.file));
  const frontendFrameworks = ["React", "Vue", "Nuxt", "Angular", "Svelte", "SvelteKit", "Astro", "Remix", "SolidJS", "Preact", "Next.js"];
  const backendFrameworks = ["Express", "Fastify", "Koa", "Hono", "NestJS", "FastAPI", "Flask", "Django"];

  function addLayer(name: ArchitectureLayer["name"], file: string): void {
    if (!layerMap.has(name)) {
      layerMap.set(name, new Set<string>());
    }
    layerMap.get(name)?.add(file);
  }

  for (const relativeFile of context.relativeFiles) {
    const lower = relativeFile.toLowerCase();

    if (lower === "readme.md" || lower.startsWith("docs/") || lower.endsWith(".md")) addLayer("docs", relativeFile);
    if (lower.startsWith(".github/workflows/") || lower.includes("docker") || lower.endsWith("nginx.conf") || lower.startsWith("deploy")) addLayer("deployment", relativeFile);
    if (lower.startsWith("tests/") || lower.includes(".test.") || lower.includes(".spec.") || lower.includes("/__tests__/")) addLayer("tests", relativeFile);
    if (lower.startsWith("scripts/") || lower.endsWith(".sh") || lower.endsWith(".ps1")) addLayer("scripts", relativeFile);
    if (
      lower.includes("prisma/") ||
      lower.endsWith(".sql") ||
      lower.includes("migration") ||
      lower.includes("models.py") ||
      lower.includes("/models/") ||
      lower.includes("/schemas/")
    ) {
      addLayer("database", relativeFile);
    }
    if (lower.includes("worker") || lower.includes("queue") || lower.includes("celery")) addLayer("workers", relativeFile);
    if (lower.includes("config") || lower === "package.json" || lower.endsWith(".toml") || lower.endsWith(".yaml") || lower.endsWith(".yml") || lower.endsWith(".json")) addLayer("config", relativeFile);
    if (lower.startsWith("packages/") || lower.startsWith("libs/") || lower.includes("/shared/")) addLayer("shared", relativeFile);
    if (entrypointFiles.has(relativeFile) && relativeFile.includes("cli")) addLayer("cli", relativeFile);
    if (routeFiles.has(relativeFile) || lower.startsWith("api/") || lower.includes("/api/") || lower.endsWith("urls.py")) addLayer("api", relativeFile);

    if (
      lower.endsWith(".tsx") ||
      lower.endsWith(".jsx") ||
      lower.endsWith(".vue") ||
      lower.endsWith(".svelte") ||
      lower.startsWith("pages/") ||
      lower.startsWith("app/") ||
      lower.startsWith("src/routes/") ||
      lower.startsWith("src/pages/") ||
      lower.includes("/components/") ||
      inputs.detectedFrameworks.some((framework) => frontendFrameworks.includes(framework))
    ) {
      if (
        lower.endsWith(".tsx") ||
        lower.endsWith(".jsx") ||
        lower.endsWith(".vue") ||
        lower.endsWith(".svelte") ||
        lower.startsWith("pages/") ||
        lower.startsWith("app/") ||
        lower.startsWith("src/routes/") ||
        lower.startsWith("src/pages/") ||
        lower.includes("/components/")
      ) {
        addLayer("frontend", relativeFile);
      }
    }

    if (
      lower.startsWith("server/") ||
      lower.startsWith("src/server") ||
      lower.startsWith("src/app") ||
      lower === "app.py" ||
      lower === "main.py" ||
      lower === "manage.py" ||
      inputs.detectedFrameworks.some((framework) => backendFrameworks.includes(framework))
    ) {
      if (
        lower.startsWith("server/") ||
        lower.startsWith("src/server") ||
        lower.startsWith("src/app") ||
        lower === "app.py" ||
        lower === "main.py" ||
        lower === "manage.py" ||
        lower.endsWith("urls.py")
      ) {
        addLayer("backend", relativeFile);
      }
    }

    if (entrypointFiles.has(relativeFile) && !layerMapHasFile(layerMap, relativeFile)) {
      addLayer("unknown", relativeFile);
    }
  }

  return [...layerMap.entries()]
    .map(([name, files]) => ({
      name,
      files: [...files].sort().slice(0, 20),
    }))
    .sort((left, right) => left.name.localeCompare(right.name));
}

function detectDataModels(context: ScanContext): ArchitectureDataModel[] {
  const models: ArchitectureDataModel[] = [];

  for (const [relativePath, content] of context.fileContentCache.entries()) {
    if (relativePath.endsWith(".prisma")) {
      const prismaRegex = /\bmodel\s+([A-Za-z_][A-Za-z0-9_]*)\s*\{/g;
      let match: RegExpExecArray | null;
      while ((match = prismaRegex.exec(content)) !== null) {
        models.push({
          name: match[1],
          source: "Prisma",
          file: relativePath,
          confidence: 0.95,
        });
      }
    }

    if (relativePath.endsWith(".sql")) {
      models.push({
        name: path.posix.basename(relativePath, ".sql"),
        source: "SQL File",
        file: relativePath,
        confidence: 0.7,
      });
    }

    const djangoRegex = /class\s+([A-Za-z_][A-Za-z0-9_]*)\(models\.Model\)/g;
    let match: RegExpExecArray | null;
    while ((match = djangoRegex.exec(content)) !== null) {
      models.push({
        name: match[1],
        source: "Django Model",
        file: relativePath,
        confidence: 0.9,
      });
    }

    const sqlalchemyRegex = /class\s+([A-Za-z_][A-Za-z0-9_]*)\([^)]*Base[^)]*\)\s*:/g;
    while ((match = sqlalchemyRegex.exec(content)) !== null) {
      models.push({
        name: match[1],
        source: "SQLAlchemy Model",
        file: relativePath,
        confidence: 0.8,
      });
    }

    const pydanticRegex = /class\s+([A-Za-z_][A-Za-z0-9_]*)\([^)]*BaseModel[^)]*\)\s*:/g;
    while ((match = pydanticRegex.exec(content)) !== null) {
      models.push({
        name: match[1],
        source: "Pydantic Model",
        file: relativePath,
        confidence: 0.85,
      });
    }

    const dataclassRegex = /@dataclass[\s\S]*?class\s+([A-Za-z_][A-Za-z0-9_]*)/g;
    while ((match = dataclassRegex.exec(content)) !== null) {
      models.push({
        name: match[1],
        source: "Python Dataclass",
        file: relativePath,
        confidence: 0.7,
      });
    }

    const mongooseRegex = /\bmodel\(\s*["'`]([A-Za-z0-9_]+)["'`]/g;
    while ((match = mongooseRegex.exec(content)) !== null) {
      models.push({
        name: match[1],
        source: "Mongoose Model",
        file: relativePath,
        confidence: 0.75,
      });
    }

    const typeOrmRegex = /@Entity\([^)]*\)\s*export\s+class\s+([A-Za-z_][A-Za-z0-9_]*)/g;
    while ((match = typeOrmRegex.exec(content)) !== null) {
      models.push({
        name: match[1],
        source: "TypeORM Entity",
        file: relativePath,
        confidence: 0.8,
      });
    }

    const sequelizeRegex = /\bdefine\(\s*["'`]([A-Za-z0-9_]+)["'`]/g;
    while ((match = sequelizeRegex.exec(content)) !== null) {
      models.push({
        name: match[1],
        source: "Sequelize Model",
        file: relativePath,
        confidence: 0.75,
      });
    }

    const drizzleRegex = /\b(?:pgTable|mysqlTable|sqliteTable)\(\s*["'`]([A-Za-z0-9_-]+)["'`]/g;
    while ((match = drizzleRegex.exec(content)) !== null) {
      models.push({
        name: match[1],
        source: "Drizzle Table",
        file: relativePath,
        confidence: 0.8,
      });
    }

    const zodRegex = /\bconst\s+([A-Z][A-Za-z0-9_]*)\s*=\s*z\.(?:object|array|union|discriminatedUnion)\(/g;
    while ((match = zodRegex.exec(content)) !== null) {
      models.push({
        name: match[1],
        source: "Zod Schema",
        file: relativePath,
        confidence: 0.7,
      });
    }
  }

  return models.filter(
    (model, index, all) =>
      all.findIndex(
        (candidate) => candidate.file === model.file && candidate.name === model.name && candidate.source === model.source,
      ) === index,
  );
}

function detectEnvUsage(context: ScanContext): ArchitectureEnvUsage[] {
  const usages: ArchitectureEnvUsage[] = [];
  const patterns: Array<{ regex: RegExp; source: string }> = [
    { regex: /\bprocess\.env\.([A-Z0-9_]+)/g, source: "process.env" },
    { regex: /\bprocess\.env\[['"`]([A-Z0-9_]+)['"`]\]/g, source: "process.env" },
    { regex: /\bimport\.meta\.env\.([A-Z0-9_]+)/g, source: "import.meta.env" },
    { regex: /\bos\.environ\.get\(\s*["']([A-Z0-9_]+)["']/g, source: "os.environ.get" },
    { regex: /\bos\.getenv\(\s*["']([A-Z0-9_]+)["']/g, source: "os.getenv" },
    { regex: /\bos\.environ\[['"`]([A-Z0-9_]+)['"`]\]/g, source: "os.environ" },
  ];

  for (const [relativePath, content] of context.fileContentCache.entries()) {
    for (const pattern of patterns) {
      let match: RegExpExecArray | null;
      while ((match = pattern.regex.exec(content)) !== null) {
        usages.push({
          name: match[1],
          file: relativePath,
          source: pattern.source,
        });
      }
    }
  }

  return usages.filter(
    (usage, index, all) =>
      all.findIndex((candidate) => candidate.name === usage.name && candidate.file === usage.file && candidate.source === usage.source) === index,
  );
}

function rankImportantFiles(
  context: ScanContext,
  entrypoints: ArchitectureEntrypoint[],
  routes: ArchitectureRoute[],
  dataModels: ArchitectureDataModel[],
  imports: ArchitectureImport[],
): ArchitectureImportantFile[] {
  const scores = new Map<string, { score: number; reasons: string[] }>();

  function addScore(file: string, value: number, reason: string): void {
    if (!scores.has(file)) {
      scores.set(file, { score: 0, reasons: [] });
    }
    const current = scores.get(file);
    if (!current) {
      return;
    }
    current.score += value;
    if (!current.reasons.includes(reason)) {
      current.reasons.push(reason);
    }
  }

  for (const relativeFile of context.relativeFiles) {
    const lower = relativeFile.toLowerCase();
    if (lower === "readme.md") addScore(relativeFile, 4, "root documentation");
    if (relativeFile === "package.json" || relativeFile === "pyproject.toml") addScore(relativeFile, 5, "root package config");
    if (context.importantConfigFiles.includes(relativeFile)) addScore(relativeFile, 5, "important config");
    if (lower.startsWith(".github/workflows/") || lower.includes("docker") || lower.endsWith("nginx.conf")) addScore(relativeFile, 4, "deployment file");
  }

  for (const entrypoint of entrypoints) {
    addScore(entrypoint.file, 8, "entrypoint");
  }

  for (const route of routes) {
    addScore(route.file, 6, "route surface");
  }

  for (const model of dataModels) {
    addScore(model.file, 6, "data model");
  }

  for (const item of imports) {
    addScore(item.file, item.resolutionKind === "alias" ? 3 : 1, item.resolutionKind === "alias" ? "alias import hub" : "import hub");
  }

  return [...scores.entries()]
    .map(([file, data]) => ({
      file,
      score: data.score,
      reasons: data.reasons,
    }))
    .sort((left, right) => right.score - left.score || left.file.localeCompare(right.file))
    .slice(0, 20);
}

function inferArchitectureStyle(inputs: ArchitectureInputs): string {
  const frameworks = inputs.detectedFrameworks;
  const frontendFrameworks = ["React", "Vue", "Nuxt", "Angular", "Svelte", "SvelteKit", "Astro", "Remix", "SolidJS", "Preact", "Next.js"];
  const backendFrameworks = ["Express", "Fastify", "Koa", "Hono", "NestJS", "FastAPI", "Flask", "Django"];
  const hasFrontendFramework = frameworks.some((framework) => frontendFrameworks.includes(framework));
  const hasBackendFramework = frameworks.some((framework) => backendFrameworks.includes(framework));

  if (inputs.monorepo.isMonorepo && hasFrontendFramework && hasBackendFramework) {
    return `${inputs.monorepo.workspaceManager ?? "workspace"} full-stack monorepo`;
  }

  if (inputs.monorepo.isMonorepo) {
    return `${inputs.monorepo.workspaceManager ?? "workspace"} monorepo ${inputs.projectType}`;
  }

  if (hasFrontendFramework && hasBackendFramework) {
    return "hybrid full-stack web application";
  }

  if (frameworks.some((framework) => ["Next.js", "Nuxt", "SvelteKit", "Remix"].includes(framework))) {
    return "file-routed full-stack web application";
  }

  if (frameworks.includes("NestJS")) return "decorator-driven backend service";
  if (frameworks.some((framework) => ["Express", "Fastify", "Koa", "Hono"].includes(framework))) return "service-oriented backend";
  if (frameworks.some((framework) => ["FastAPI", "Flask", "Django"].includes(framework))) return "python web service";
  if (frameworks.some((framework) => ["React", "Vue", "Angular", "Svelte", "Astro", "SolidJS", "Preact"].includes(framework))) {
    return "component-driven frontend application";
  }
  if (frameworks.some((framework) => ["Typer", "Click"].includes(framework)) || inputs.projectType === "cli-tool") return "command-line automation tool";
  if (inputs.projectType === "library-package") return "library package";

  return inputs.projectType;
}

function resolvePythonInternalTarget(sourceFile: string, target: string, fileSet: Set<string>): string | null {
  const leadingDotsMatch = target.match(/^(\.+)(.*)$/);
  let basePath = "";

  if (leadingDotsMatch) {
    const dotPrefix = leadingDotsMatch[1];
    const remainder = leadingDotsMatch[2];
    const sourceDir = path.posix.dirname(sourceFile);
    const segments = sourceDir === "." ? [] : sourceDir.split("/");
    const ascents = Math.max(0, dotPrefix.length - 1);
    const keptSegments = segments.slice(0, Math.max(0, segments.length - ascents));
    basePath = [...keptSegments, ...remainder.split(".").filter(Boolean)].join("/");
  } else {
    basePath = target.replace(/\./g, "/");
  }

  const candidates = [basePath, `${basePath}.py`, `${basePath}/__init__.py`].filter(Boolean);
  for (const candidate of candidates) {
    if (fileSet.has(candidate)) {
      return candidate;
    }
  }

  return null;
}

function getExternalPackageName(target: string): string {
  if (target.startsWith("@")) {
    const [scope, name] = target.split("/");
    return name ? `${scope}/${name}` : target;
  }

  return target.split("/")[0] ?? target;
}

function sortFileCounts(items: DependencyGraphFileCount[]): DependencyGraphFileCount[] {
  return items.sort((left, right) => right.count - left.count || left.file.localeCompare(right.file));
}

function sortPackageCounts(items: DependencyGraphPackageCount[]): DependencyGraphPackageCount[] {
  return items.sort((left, right) => right.count - left.count || left.packageName.localeCompare(right.packageName));
}

export function detectDependencyGraph(imports: ArchitectureImport[]): DependencyGraphInfo {
  const internalEdges: DependencyGraphEdge[] = [];
  const internalEdgeKeys = new Set<string>();
  const inboundCounts = new Map<string, number>();
  const outboundCounts = new Map<string, Set<string>>();
  const externalPackageCounts = new Map<string, number>();
  let unresolvedInternalImports = 0;

  for (const item of imports) {
    if (item.internal) {
      if (!item.resolvedTarget) {
        unresolvedInternalImports += 1;
        continue;
      }

      const key = `${item.file}|${item.resolvedTarget}|${item.kind}`;
      if (!internalEdgeKeys.has(key)) {
        internalEdgeKeys.add(key);
        internalEdges.push({
          from: item.file,
          to: item.resolvedTarget,
          kind: item.kind,
        });
      }

      inboundCounts.set(item.resolvedTarget, (inboundCounts.get(item.resolvedTarget) ?? 0) + 1);
      if (!outboundCounts.has(item.file)) {
        outboundCounts.set(item.file, new Set<string>());
      }
      outboundCounts.get(item.file)?.add(item.resolvedTarget);
      continue;
    }

    const packageName = getExternalPackageName(item.target);
    externalPackageCounts.set(packageName, (externalPackageCounts.get(packageName) ?? 0) + 1);
    if (!outboundCounts.has(item.file)) {
      outboundCounts.set(item.file, new Set<string>());
    }
    outboundCounts.get(item.file)?.add(packageName);
  }

  const topImportedInternalFiles = sortFileCounts(
    [...inboundCounts.entries()].map(([file, count]) => ({ file, count })),
  ).slice(0, 10);
  const highFanInFiles = topImportedInternalFiles.slice(0, 5);
  const highFanOutFiles = sortFileCounts(
    [...outboundCounts.entries()].map(([file, targets]) => ({ file, count: targets.size })),
  ).slice(0, 5);
  const packageCountItems = sortPackageCounts(
    [...externalPackageCounts.entries()].map(([packageName, count]) => ({ packageName, count })),
  );
  const possibleCycles = detectPossibleCycles(internalEdges);
  const notes = [
    `Resolved ${internalEdges.length} internal dependency edge(s).`,
    `Detected ${packageCountItems.length} unique external package import(s).`,
    "Cycle detection is limited to small resolvable mutual-import patterns.",
  ];

  if (unresolvedInternalImports > 0) {
    notes.push(`${unresolvedInternalImports} internal import(s) could not be resolved to repo files.`);
  }

  return {
    internalEdges: internalEdges.sort((left, right) => left.from.localeCompare(right.from) || left.to.localeCompare(right.to)),
    externalPackages: packageCountItems.map((item) => item.packageName),
    topImportedExternalPackages: packageCountItems.slice(0, 10),
    topImportedInternalFiles,
    highFanInFiles,
    highFanOutFiles,
    possibleCycles,
    notes,
  };
}

function detectPossibleCycles(internalEdges: DependencyGraphEdge[]): DependencyGraphCycleHint[] {
  const edgeMap = new Map<string, Set<string>>();
  const cycles = new Map<string, DependencyGraphCycleHint>();

  for (const edge of internalEdges) {
    if (!edgeMap.has(edge.from)) {
      edgeMap.set(edge.from, new Set<string>());
    }
    edgeMap.get(edge.from)?.add(edge.to);
  }

  for (const edge of internalEdges) {
    if (edgeMap.get(edge.to)?.has(edge.from)) {
      const files = [edge.from, edge.to].sort();
      const key = files.join("|");
      if (!cycles.has(key)) {
        cycles.set(key, {
          files,
          note: `Mutual import detected between ${files[0]} and ${files[1]}.`,
        });
      }
    }
  }

  return [...cycles.values()].sort((left, right) => left.files.join("|").localeCompare(right.files.join("|")));
}

export function detectHealthEndpoints(routes: ArchitectureRoute[]): { hasHealthEndpoint: boolean; detectedHealthRoutes: string[] } {
  const detectedHealthRoutes = [...new Set(
    routes
      .map((route) => route.path)
      .filter((routePath) => HEALTH_ROUTE_HINTS.has(routePath.toLowerCase())),
  )].sort();

  return {
    hasHealthEndpoint: detectedHealthRoutes.length > 0,
    detectedHealthRoutes,
  };
}

export function buildMonorepoPackageGraph(
  context: ScanContext,
  packageRelationships: ArchitecturePackageRelationship[],
): MonorepoPackageGraph | null {
  const manifests = parsePackageManifests(context).filter((manifest) => manifest.root !== "");
  if (manifests.length === 0) {
    return null;
  }

  const manifestNames = manifests.map((manifest) => manifest.name);
  const touchedPackages = new Set<string>();
  const consumersByPackage = new Map<string, Set<string>>();

  for (const relationship of packageRelationships) {
    touchedPackages.add(relationship.sourcePackage);
    touchedPackages.add(relationship.targetPackage);

    if (!consumersByPackage.has(relationship.targetPackage)) {
      consumersByPackage.set(relationship.targetPackage, new Set<string>());
    }
    consumersByPackage.get(relationship.targetPackage)?.add(relationship.sourcePackage);
  }

  const orphanPackages = manifestNames.filter((name) => !touchedPackages.has(name)).sort();
  const sharedPackages = [...consumersByPackage.entries()]
    .map(([packageName, usedBy]) => ({
      packageName,
      usedBy: [...usedBy].sort(),
    }))
    .filter((entry) => entry.usedBy.length > 1)
    .sort((left, right) => right.usedBy.length - left.usedBy.length || left.packageName.localeCompare(right.packageName));

  return {
    relationships: packageRelationships,
    orphanPackages,
    sharedPackages,
  };
}

export function detectArchitecture(context: ScanContext, inputs: ArchitectureInputs): ArchitectureInfo {
  const manifests = parsePackageManifests(context);
  const entrypoints = detectEntrypoints(context);
  const routes = detectRoutes(context);
  const imports = detectImports(context);
  const moduleResolution = createModuleResolver(context).summarize(imports);
  const packageRelationships = detectPackageRelationships(imports, manifests);
  const dataModels = detectDataModels(context);
  const envUsage = detectEnvUsage(context);
  const layers = detectLayers(context, inputs, routes, entrypoints);
  const importantFiles = rankImportantFiles(context, entrypoints, routes, dataModels, imports);
  const architectureStyle = inferArchitectureStyle(inputs);
  const notes = [
    `Detected ${entrypoints.length} likely entrypoint(s).`,
    `Detected ${routes.length} route or route-hint record(s).`,
    `Detected ${imports.length} lightweight import record(s).`,
    inputs.monorepo.isMonorepo ? `Detected ${packageRelationships.length} workspace package relationship(s).` : "No monorepo package relationships were expected.",
    ...moduleResolution.notes,
  ];

  return {
    entrypoints,
    routes,
    imports,
    moduleResolution,
    layers,
    dataModels,
    envUsage,
    packageRelationships,
    importantFiles,
    architectureStyle,
    notes,
  };
}
