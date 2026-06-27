# GitHub Release Notes

## RepoRadar AI v0.2.0

### Overview

RepoRadar AI is a deterministic CLI scanner that turns any codebase into structured reports, architecture docs, and AI-agent context. It runs entirely locally, requires zero configuration, and never sends your code to a third party.

This release marks the first public release candidate.

### Features

- **Deterministic repo scanning** — no AI keys, no cloud, no database
- **Project classification** — frontend, backend, full-stack, CLI, library, unknown
- **Framework detection** — React, Next.js, Vue, Svelte, Express, Fastify, NestJS, FastAPI, Flask, Django, and more
- **Alias-aware import resolution** — tsconfig, jsconfig, Vite, webpack-style aliases, import maps
- **Route detection** — Express, Fastify, Next.js, React Router, Vue Router, Angular, Remix, Astro, SvelteKit, NestJS, FastAPI, Flask, Django
- **Data model detection** — Prisma, Drizzle, Zod, Mongoose, TypeORM, Sequelize, Django ORM, Pydantic, SQLAlchemy, SQL files, Python dataclasses
- **Dependency graph summaries** — internal edges, external packages, high fan-in/out files, cycle hints
- **Health scoring** — documentation, structure, security, testing, deployment readiness, AI readiness
- **Architecture risk detection** — surfaced with severity, title, detail, and suggested fix
- **Safe scan limits** — configurable max files and max file size with explicit skip reporting
- **Monorepo hints** — npm workspaces, pnpm workspace, Turborepo, shared config packages
- **Deployment signal detection** — Docker, PM2, GitHub Actions, Vercel, Netlify, Render, Railway

### CLI Commands

```bash
# Scan a project
node dist/cli.js scan ./my-project

# Output clean JSON
node dist/cli.js scan ./my-project --json

# Custom output directory
node dist/cli.js scan ./my-project --output reports/

# Use a custom config
node dist/cli.js scan ./my-project --config ./reporadar.config.json

# Generate a starter config
node dist/cli.js init

# Help and version
node dist/cli.js --help
node dist/cli.js --version
```

### Generated Outputs

| File | Purpose |
| --- | --- |
| `repo-facts.json` | Full machine-readable scan facts |
| `PROJECT_REPORT.md` | High-level project summary |
| `ARCHITECTURE.md` | Entrypoints, routes, layers, dependencies, and risks |
| `TECH_STACK.md` | Languages, frameworks, ecosystem and module-resolution signals |
| `SECURITY_NOTES.md` | Security-oriented findings and cautions |
| `README_SUGGESTION.md` | Draft structure for repo documentation |
| `AI_AGENT_PROMPT.md` | Deterministic context for future agent workflows |
| `LINKEDIN_POST.md` | Social-ready summary copy |
| `PORTFOLIO_CASE_STUDY.md` | Portfolio-oriented project framing |

### Install And Test

```bash
git clone https://github.com/3bud-ZC/RepoRadar-Ai.git
cd RepoRadar-Ai
npm install
npm run validate
node dist/cli.js scan ./sample-project
```

### Limitations

- Alias parsing is static and heuristic; runtime-computed aliases may be missed.
- Route and model detection are regex-driven and may underdetect unconventional patterns.
- Dependency cycle detection is intentionally lightweight.
- The scanner reflects static file structure, not runtime execution truth.

### Known Issues

- `npm run ... --json` can include npm wrapper output. Use `node dist/cli.js scan ... --json` for clean JSON.
- Some highly dynamic framework patterns may require manual confirmation.

### Roadmap

- Deeper package-manager-specific resolution
- More edge-case route coverage
- Optional local AI summaries (future, not required)

---

Built by **Abed** for **abud.fun** — https://github.com/3bud-ZC/RepoRadar-Ai
