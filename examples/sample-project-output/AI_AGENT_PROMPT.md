# AI Agent Prompt: sample-project

> **Note:** This prompt provides general project context for continuing development. For a focused fix-oriented prompt, see `AGENT_FIX_PROMPT.md`.

Use this deterministic project intelligence before making changes.

## Project Context

- Project type: full-stack-app
- Languages: TypeScript, JSON, Markdown
- Frameworks and tools: Docker, ESLint, Express, Jest, Playwright, PostgreSQL, Prettier, Prisma, React, Tailwind CSS, Vite, Vitest
- Package manager: npm
- Monorepo: no
- Workspace manager: unknown
- Python detected: no
- Architecture style: hybrid full-stack web application
- Config output directory: .reporadar
- Health endpoint: /health
- Health score: 91/100

## Entrypoints

- src/main.tsx - Common frontend bootstrap entrypoint.
- server/index.ts - Common backend server entrypoint.

## Routes

- GET /health (Express)

## Layers

- api: server/index.ts
- backend: server/index.ts
- config: package-lock.json, package.json, tsconfig.json, vite.config.ts
- database: prisma/schema.prisma
- deployment: Dockerfile, deploy.md
- docs: README.md, deploy.md
- frontend: src/main.tsx
- tests: tests/app.test.ts

## Data Models

- Project (Prisma)

## Environment Variable Names

- None

## Module Resolution

- Alias config files: tsconfig.json
- Alias patterns: none
- Base paths: none

## Dependency Graph Summary

- Internal edges: 0
- External packages: express (1)
- High fan-in files: none
- High fan-out files: server/index.ts (1)

## Architecture Risks

- WARNING: Docker build context may be noisy - Add .dockerignore to exclude node_modules, build output, secrets, and local caches from Docker builds.

## Current Issues

- Dockerfile detected without .dockerignore.

## Next Recommended Tasks

1. Add .dockerignore so Docker builds exclude local dependencies, secrets, and generated files.
2. Add .dockerignore to exclude node_modules, build output, secrets, and local caches from Docker builds.

## Config Constraints

- Include patterns: default full-repo scan
- Exclude patterns: .reporadar, .reporadar/**
- Max files: 5000
- Max file size KB: 512
- Config warnings: none

## Safe Constraints

- Maintain exactly one status file named `STATUS.md` in the project root.
- Do not expose secret values from env files or inline credentials.
- Run tests before reporting completion.
- Update README when behavior changes.
- Respect the existing structure before proposing large rewrites.
- Use detected scripts and config files as the primary source of truth.
