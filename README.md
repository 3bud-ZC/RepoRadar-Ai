# RepoRadar AI

> Instant repository intelligence. No AI keys, no cloud, no database.

RepoRadar AI is a deterministic CLI scanner that turns any codebase into structured reports, architecture docs, and AI-agent context in seconds. It runs entirely locally, requires zero configuration, and never sends your code to a third party.

## Demo Preview

**Best demo command**

```bash
node dist/cli.js scan ./sample-project
```

**JSON output demo**

```bash
node dist/cli.js scan ./sample-project --json
```

> Screenshot/GIF capture instructions: Record your terminal running the command above, then scroll through the generated `PROJECT_REPORT.md` and `ARCHITECTURE.md`. Save the asset as `docs/demo.gif` and reference it below.

![Demo GIF placeholder](docs/demo.gif)

*Demo outputs are already checked into the repo:*

- [repo-facts.json](examples/sample-project-output/repo-facts.json)
- [PROJECT_REPORT.md](examples/sample-project-output/PROJECT_REPORT.md)
- [ARCHITECTURE.md](examples/sample-project-output/ARCHITECTURE.md)
- [TECH_STACK.md](examples/sample-project-output/TECH_STACK.md)
- [SECURITY_NOTES.md](examples/sample-project-output/SECURITY_NOTES.md)
- [README_SUGGESTION.md](examples/sample-project-output/README_SUGGESTION.md)
- [AI_AGENT_PROMPT.md](examples/sample-project-output/AI_AGENT_PROMPT.md)
- [LINKEDIN_POST.md](examples/sample-project-output/LINKEDIN_POST.md)
- [PORTFOLIO_CASE_STUDY.md](examples/sample-project-output/PORTFOLIO_CASE_STUDY.md)
- [FIX_PLAN.md](examples/sample-project-output/FIX_PLAN.md)
- [QUICK_WINS.md](examples/sample-project-output/QUICK_WINS.md)
- [GITHUB_ISSUES.md](examples/sample-project-output/GITHUB_ISSUES.md)
- [AGENT_FIX_PROMPT.md](examples/sample-project-output/AGENT_FIX_PROMPT.md)

## Why This Exists

Repositories often have enough signal to produce strong project intelligence before adding any AI layer. RepoRadar AI focuses on deterministic scanning first so teams can:

- understand an unfamiliar repo quickly
- surface architecture and quality risks
- produce reusable demo and onboarding outputs
- prepare for future optional AI features without depending on them today

## Features

- Deterministic repo scanning with no paid AI required
- CLI-first workflow for local projects
- Project classification for frontend, backend, full-stack, CLI, library, and unknown repos
- Alias-aware import resolution from `tsconfig`, `jsconfig`, Vite config, webpack-style alias hints, and package import maps
- Expanded framework detection across modern JS/TS and Python ecosystems
- Route detection across Express-style routers, Fastify, Next.js, React Router, Vue Router, Angular Router, Remix, Astro, SvelteKit, NestJS, FastAPI, Flask, and Django URL configs
- Model and schema detection for Prisma, Drizzle, Zod, Mongoose, TypeORM, Sequelize, Django, Pydantic, SQLAlchemy-style patterns, SQL files, and Python dataclasses
- Dependency graph summaries, package relationships, monorepo hints, and health endpoint detection
- Generated reports for projects, architecture, tech stack, security notes, README drafting, AI-agent context, portfolio copy, and social-post copy
- Actionable improvement outputs: FIX_PLAN.md, QUICK_WINS.md, GITHUB_ISSUES.md, and AGENT_FIX_PROMPT.md
- Safe scan limits and explicit skipped-file reporting

## Quick Start

```bash
npm install
npm run build
node dist/cli.js scan ./sample-project
```

For clean machine-readable JSON:

```bash
node dist/cli.js scan ./sample-project --json
```

## CLI Usage

```bash
node dist/cli.js --help
node dist/cli.js --version
node dist/cli.js scan ./sample-project
node dist/cli.js scan ./sample-project --json
node dist/cli.js scan ./sample-project --output demo-output
node dist/cli.js scan ./sample-project --config ./sample-project/reporadar.config.json
node dist/cli.js init
node dist/cli.js launch
```

Notes:

- `npm run dev -- scan ... --json` may include npm wrapper output around the CLI response.
- `node dist/cli.js scan ./sample-project --json` emits clean JSON directly.
- `init` creates a starter `reporadar.config.json` and will not overwrite an existing file unless `--force` is passed.

## Desktop Launcher (Windows)

RepoRadar AI includes an interactive launcher for Windows users who prefer a graphical folder picker and menu-driven workflow.

### Create a Desktop Shortcut

```bash
npm install
npm run build
npm run shortcut:windows
```

This creates `RepoRadar AI.lnk` on your Desktop. Double-click it to launch the interactive picker.

### Run Launcher Manually

```bash
node dist/cli.js launch
```

### What the Launcher Does

1. Shows a friendly menu in the terminal
2. Lets you pick a folder using the Windows folder picker, or type a path manually
3. Runs a full scan on the selected project
4. Shows the scan summary (project name, type, health score, generated files, top risks)
5. Offers a post-scan menu to open the output folder or specific reports

### Launcher Commands

```bash
# Interactive launcher (all platforms)
node dist/cli.js launch

# Windows PowerScript launcher
npm run launcher:windows

# Create Desktop shortcut (Windows)
npm run shortcut:windows
```

### Troubleshooting

- **Folder picker does not appear**: The launcher falls back to manual path entry automatically.
- **Build missing**: The PowerShell launcher auto-runs `npm run build` if `dist/cli.js` is missing.
- **Shortcut already exists**: Use `npm run shortcut:windows -- --Force` or delete the old shortcut first.

See [docs/DESKTOP_LAUNCHER.md](docs/DESKTOP_LAUNCHER.md) for full details.

## Config Example

```json
{
  "projectName": "optional override",
  "include": ["src/**"],
  "exclude": ["generated/**", "vendor/**"],
  "maxFiles": 5000,
  "maxFileSizeKb": 512,
  "reports": {
    "project": true,
    "architecture": true,
    "techStack": true,
    "security": true,
    "readme": true,
    "agentPrompt": true,
    "linkedin": true,
    "portfolio": true
  },
  "outputDir": ".reporadar"
}
```

## Generated Outputs

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

## Demo

The checked-in sample output set lives under [examples/sample-project-output](examples/sample-project-output).

The example `repo-facts.json` is sanitized to avoid local absolute machine paths:

- `metadata.rootPath` is set to `<sample-project>`
- `metadata.outputPath` is set to `<sample-project>/.reporadar`

Refresh the example set with:

```bash
npm run examples:refresh
```

## Supported Ecosystems And Frameworks

- JavaScript and TypeScript: React, React Router, Vite, Next.js, Vue, Nuxt, Angular, Svelte, SvelteKit, Astro, Remix, SolidJS, Preact
- Backend: Express, Fastify, Koa, NestJS, Hono
- Python: FastAPI, Flask, Django, Typer, Click, Streamlit
- Data and ORM: Prisma, Drizzle ORM, Zod, Mongoose, Sequelize, TypeORM, PostgreSQL hints
- Tooling and release signals: Docker, PM2, ESLint, Prettier, Vitest, Jest, Playwright, Cypress, Pytest, GitHub Actions, Vercel, Netlify, Render, Railway

## No Paid AI Required

RepoRadar AI is intentionally deterministic in the current phase. It does not require:

- an OpenAI key
- any cloud AI provider
- a hosted dashboard
- a database
- authentication

## Security And Privacy

- RepoRadar AI never sends your code to a cloud service.
- `.env` files are detected but their values are never printed into reports.
- No secrets are extracted from scanned files.
- Keep `reporadar.config.json` free of real credentials if you commit it.

## Roadmap

- Phase 3A: release candidate finalization and launch assets
- Future deterministic work: deeper package-manager-specific resolution and more edge-case route coverage
- Later optional work: local AI summaries and AI-assisted repo workflows (not required for launch)

## Limitations

- Alias parsing is static and heuristic, so indirect runtime-computed aliases can still be missed.
- Route and model detection are regex-driven and may underdetect unconventional patterns.
- Dependency cycles are intentionally lightweight and limited to resolvable mutual-import hints.
- The scanner is optimized for deterministic local signal, not runtime execution truth.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for setup, test commands, fixture guidance, and project rules.

## Changelog

See [CHANGELOG.md](CHANGELOG.md) for version history.

## License

MIT
