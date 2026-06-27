import path from "node:path";
import type { LanguageStat, PackageJsonLike, ScanContext } from "../types/repoFacts";

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  ".ts": "TypeScript",
  ".tsx": "TypeScript",
  ".js": "JavaScript",
  ".jsx": "JavaScript",
  ".mjs": "JavaScript",
  ".cjs": "JavaScript",
  ".vue": "Vue",
  ".svelte": "Svelte",
  ".py": "Python",
  ".html": "HTML",
  ".css": "CSS",
  ".scss": "CSS",
  ".sass": "CSS",
  ".less": "CSS",
  ".json": "JSON",
  ".md": "Markdown",
};

function hasDependency(pkg: PackageJsonLike | null, dependencyName: string): boolean {
  if (!pkg) {
    return false;
  }

  return Boolean(pkg.dependencies?.[dependencyName] || pkg.devDependencies?.[dependencyName]);
}

function manifestMentions(context: ScanContext, dependencyName: string): boolean {
  const needle = `"${dependencyName}"`;
  return fileCacheContains(
    context,
    (relativePath, content) => relativePath.endsWith("package.json") && content.includes(needle),
  );
}

function hasConfig(relativeFiles: Set<string>, configNames: string[]): boolean {
  return configNames.some((configName) => relativeFiles.has(configName));
}

function fileCacheContains(context: ScanContext, matcher: (relativePath: string, content: string) => boolean): boolean {
  for (const [relativePath, content] of context.fileContentCache.entries()) {
    if (matcher(relativePath, content)) {
      return true;
    }
  }

  return false;
}

function addIf(frameworks: Set<string>, condition: boolean, name: string): void {
  if (condition) {
    frameworks.add(name);
  }
}

export function detectLanguages(context: ScanContext): LanguageStat[] {
  const counts = new Map<string, number>();

  for (const file of context.allFiles) {
    const extension = path.extname(file).toLowerCase();
    const language = LANGUAGE_EXTENSIONS[extension];
    if (!language) {
      continue;
    }

    counts.set(language, (counts.get(language) ?? 0) + 1);
  }

  return [...counts.entries()]
    .map(([name, fileCount]) => ({ name, fileCount }))
    .sort((left, right) => right.fileCount - left.fileCount || left.name.localeCompare(right.name));
}

export function detectFrameworks(context: ScanContext): string[] {
  const frameworks = new Set<string>();
  const relativeFiles = new Set(context.relativeFiles);
  const packageJson = context.packageJson;

  addIf(
    frameworks,
    hasDependency(packageJson, "react") ||
      manifestMentions(context, "react") ||
      context.relativeFiles.some((file) => file.endsWith(".tsx") || file.endsWith(".jsx")) ||
      fileCacheContains(context, (_relativePath, content) => content.includes("ReactDOM.createRoot") || content.includes("react/jsx-runtime")),
    "React",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "react-router-dom") ||
      manifestMentions(context, "react-router-dom") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("react-router-dom") || content.includes("createBrowserRouter")),
    "React Router",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "vite") ||
      manifestMentions(context, "vite") ||
      hasConfig(relativeFiles, ["vite.config.ts", "vite.config.js", "vite.config.mjs", "vite.config.cjs"]),
    "Vite",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "next") ||
      manifestMentions(context, "next") ||
      hasConfig(relativeFiles, ["next.config.js", "next.config.ts", "next.config.mjs"]) ||
      context.relativeFiles.some((file) => file.endsWith("/app/layout.tsx") || file === "app/layout.tsx" || file.endsWith("/pages/_app.tsx") || file === "pages/_app.tsx"),
    "Next.js",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "vue") ||
      manifestMentions(context, "vue") ||
      context.relativeFiles.some((file) => file.endsWith(".vue")),
    "Vue",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "nuxt") ||
      manifestMentions(context, "nuxt") ||
      hasConfig(relativeFiles, ["nuxt.config.ts", "nuxt.config.js"]) ||
      context.relativeFiles.some((file) => file.startsWith("pages/") && file.endsWith(".vue")),
    "Nuxt",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "@angular/core") ||
      manifestMentions(context, "@angular/core") ||
      hasConfig(relativeFiles, ["angular.json"]) ||
      fileCacheContains(context, (_relativePath, content) => content.includes("@angular/core") || content.includes("@angular/router")),
    "Angular",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "svelte") ||
      manifestMentions(context, "svelte") ||
      context.relativeFiles.some((file) => file.endsWith(".svelte")),
    "Svelte",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "@sveltejs/kit") ||
      manifestMentions(context, "@sveltejs/kit") ||
      hasConfig(relativeFiles, ["svelte.config.js", "svelte.config.ts"]) ||
      context.relativeFiles.some((file) => file.startsWith("src/routes/") && file.includes("+page")),
    "SvelteKit",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "astro") ||
      manifestMentions(context, "astro") ||
      hasConfig(relativeFiles, ["astro.config.mjs", "astro.config.ts"]) ||
      context.relativeFiles.some((file) => file.startsWith("src/pages/") && file.endsWith(".astro")),
    "Astro",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "@remix-run/react") ||
      manifestMentions(context, "@remix-run/react") ||
      hasConfig(relativeFiles, ["remix.config.js", "remix.config.ts"]) ||
      context.relativeFiles.some((file) => file.startsWith("app/routes/")),
    "Remix",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "solid-js") ||
      manifestMentions(context, "solid-js") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("solid-js")),
    "SolidJS",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "preact") ||
      manifestMentions(context, "preact") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("preact")),
    "Preact",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "express") ||
      manifestMentions(context, "express") ||
      fileCacheContains(
        context,
        (_relativePath, content) =>
          content.includes("from \"express\"") ||
          content.includes("from 'express'") ||
          content.includes("require(\"express\")") ||
          content.includes("express()"),
      ),
    "Express",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "fastify") ||
      manifestMentions(context, "fastify") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("from \"fastify\"") || content.includes("fastify.route(")),
    "Fastify",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "koa") ||
      hasDependency(packageJson, "@koa/router") ||
      hasDependency(packageJson, "koa-router") ||
      manifestMentions(context, "koa") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("@koa/router") || content.includes("koa-router")),
    "Koa",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "@nestjs/core") ||
      hasDependency(packageJson, "@nestjs/common") ||
      manifestMentions(context, "@nestjs/core") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("@Controller(") || content.includes("@nestjs/common")),
    "NestJS",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "hono") ||
      manifestMentions(context, "hono") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("from \"hono\"") || content.includes("new Hono(")),
    "Hono",
  );

  addIf(
    frameworks,
    fileCacheContains(context, (_relativePath, content) => content.includes("fastapi") || content.includes("from fastapi import")),
    "FastAPI",
  );

  addIf(
    frameworks,
    fileCacheContains(context, (_relativePath, content) => content.includes("flask") || content.includes("from flask import")),
    "Flask",
  );

  addIf(
    frameworks,
    fileCacheContains(context, (_relativePath, content) => content.includes("django") || content.includes("DJANGO_SETTINGS_MODULE") || content.includes("from django")),
    "Django",
  );

  addIf(
    frameworks,
    fileCacheContains(context, (_relativePath, content) => content.includes("streamlit")) ||
      hasDependency(packageJson, "streamlit" as never),
    "Streamlit",
  );

  addIf(
    frameworks,
    fileCacheContains(context, (_relativePath, content) => content.includes("import typer") || content.includes("from typer import")) ||
      fileCacheContains(context, (relativePath, content) => relativePath === "pyproject.toml" && content.includes("typer")),
    "Typer",
  );

  addIf(
    frameworks,
    fileCacheContains(context, (_relativePath, content) => content.includes("import click") || content.includes("from click import")) ||
      fileCacheContains(context, (relativePath, content) => relativePath === "pyproject.toml" && content.includes("click")),
    "Click",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "tailwindcss") ||
      manifestMentions(context, "tailwindcss") ||
      hasConfig(relativeFiles, ["tailwind.config.js", "tailwind.config.ts", "tailwind.config.cjs"]) ||
      fileCacheContains(
        context,
        (_relativePath, content) =>
          content.includes("@tailwind base") || content.includes("@tailwind utilities") || content.includes("tailwindcss"),
      ),
    "Tailwind CSS",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "prisma") ||
      manifestMentions(context, "prisma") ||
      relativeFiles.has("prisma/schema.prisma") ||
      fileCacheContains(context, (relativePath, content) => relativePath.endsWith(".prisma") || content.includes("prisma-client-js")),
    "Prisma",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "drizzle-orm") ||
      manifestMentions(context, "drizzle-orm") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("pgTable(") || content.includes("drizzle-orm")),
    "Drizzle ORM",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "mongoose") ||
      manifestMentions(context, "mongoose") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("mongoose") || content.includes("new Schema(")),
    "Mongoose",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "sequelize") ||
      manifestMentions(context, "sequelize") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("sequelize")),
    "Sequelize",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "typeorm") ||
      manifestMentions(context, "typeorm") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("@Entity(") || content.includes("typeorm")),
    "TypeORM",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "zod") ||
      manifestMentions(context, "zod") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("z.object(") || content.includes("from \"zod\"") || content.includes("from 'zod'")),
    "Zod",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "pg") ||
      hasDependency(packageJson, "postgres") ||
      manifestMentions(context, "pg") ||
      manifestMentions(context, "postgres") ||
      fileCacheContains(context, (_relativePath, content) => content.includes("postgresql") || content.includes("DATABASE_URL")),
    "PostgreSQL",
  );

  addIf(
    frameworks,
    hasConfig(relativeFiles, ["Dockerfile", "docker-compose.yml", "docker-compose.yaml"]) ||
      fileCacheContains(context, (relativePath, content) => relativePath.endsWith("Dockerfile") || content.includes("FROM node:")),
    "Docker",
  );

  addIf(frameworks, hasConfig(relativeFiles, [".dockerignore"]), "Docker Ignore");

  addIf(
    frameworks,
    hasConfig(relativeFiles, ["pm2.config.js", "ecosystem.config.js", "ecosystem.config.cjs"]) ||
      hasDependency(packageJson, "pm2") ||
      manifestMentions(context, "pm2"),
    "PM2",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "eslint") ||
      manifestMentions(context, "eslint") ||
      hasConfig(relativeFiles, [".eslintrc", ".eslintrc.js", ".eslintrc.cjs", ".eslintrc.json", "eslint.config.js", "eslint.config.mjs", "eslint.config.cjs"]),
    "ESLint",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "prettier") ||
      manifestMentions(context, "prettier") ||
      hasConfig(relativeFiles, [".prettierrc", ".prettierrc.json", "prettier.config.js", "prettier.config.cjs"]),
    "Prettier",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "jest") ||
      manifestMentions(context, "jest") ||
      hasConfig(relativeFiles, ["jest.config.js", "jest.config.ts"]) ||
      fileCacheContains(context, (_relativePath, content) => content.includes("describe(") && content.includes("it(") && content.includes("expect(")),
    "Jest",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "vitest") ||
      manifestMentions(context, "vitest") ||
      hasConfig(relativeFiles, ["vitest.config.ts", "vitest.config.js", "vitest.config.mjs", "vitest.config.cjs"]),
    "Vitest",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "@playwright/test") ||
      manifestMentions(context, "@playwright/test") ||
      hasConfig(relativeFiles, ["playwright.config.ts", "playwright.config.js"]),
    "Playwright",
  );

  addIf(
    frameworks,
    hasDependency(packageJson, "cypress") ||
      manifestMentions(context, "cypress") ||
      hasConfig(relativeFiles, ["cypress.config.ts", "cypress.config.js"]),
    "Cypress",
  );

  addIf(
    frameworks,
    hasConfig(relativeFiles, ["pytest.ini", "tox.ini"]) ||
      fileCacheContains(context, (relativePath, content) => relativePath === "pyproject.toml" && content.includes("[tool.pytest")),
    "Pytest",
  );

  addIf(frameworks, context.relativeFiles.some((file) => file.startsWith(".github/workflows/")), "GitHub Actions");
  addIf(frameworks, context.relativeFiles.includes("vercel.json"), "Vercel");
  addIf(frameworks, context.relativeFiles.includes("netlify.toml"), "Netlify");
  addIf(frameworks, context.relativeFiles.includes("render.yaml") || context.relativeFiles.includes("render.yml"), "Render");
  addIf(frameworks, context.relativeFiles.includes("railway.json") || context.relativeFiles.includes("railway.toml"), "Railway");
  addIf(frameworks, context.relativeFiles.some((file) => file.endsWith("nginx.conf") || file === "nginx.conf"), "Nginx");
  addIf(frameworks, context.relativeFiles.includes("poetry.lock"), "Poetry");

  return [...frameworks].sort();
}

export function detectPackageManager(context: ScanContext): string | null {
  const files = new Set(context.relativeFiles);
  if (files.has("pnpm-lock.yaml")) return "pnpm";
  if (files.has("yarn.lock")) return "yarn";
  if (files.has("bun.lockb") || files.has("bun.lock")) return "bun";
  if (files.has("package-lock.json")) return "npm";
  if (files.has("poetry.lock")) return "poetry";
  if (files.has("Pipfile.lock") || files.has("Pipfile")) return "pipenv";
  if (files.has("requirements.txt")) return "pip";
  return null;
}
