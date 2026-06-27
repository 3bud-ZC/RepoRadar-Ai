# AI Agent Prompt: Configured Fixture

Use this deterministic project intelligence before making changes.

## Project Context

- Project type: unknown
- Languages: JSON, Markdown, TypeScript
- Frameworks and tools: unknown
- Package manager: unknown
- Monorepo: no
- Workspace manager: unknown
- Python detected: no
- Architecture style: unknown
- Config output directory: .custom-radar
- Health endpoint: not detected
- Health score: 25/100

## Entrypoints

- src/index.ts - Detected from package.json `dev` script.
- src/index.ts - Common source entrypoint file.

## Routes

- None

## Layers

- config: package.json, reporadar.config.json
- docs: README.md
- unknown: src/index.ts

## Data Models

- None

## Environment Variable Names

- None

## Dependency Graph Summary

- Internal edges: 0
- External packages: node:http (1)
- High fan-in files: none
- High fan-out files: src/index.ts (1)

## Architecture Risks

- None

## Current Issues

- No tests detected.
- No lint script found in package.json.
- No build script found in package.json.
- No root lockfile detected for dependency reproducibility.
- No major frameworks or tooling detected.
- Project type could not be confidently inferred.
- No deployment or CI signals were detected.

## Next Recommended Tasks

1. Add smoke tests or unit tests to increase confidence in future scans.
2. Add .env.example to document required environment variables safely.
3. Commit a root lockfile to make dependency installs reproducible.
4. Add clearer scripts, docs, or config files so project type becomes easier to infer.
5. Add deployment config, CI workflows, or deployment docs to improve release readiness.

## Config Constraints

- Include patterns: src/**, package.json, README.md, reporadar.config.json
- Exclude patterns: src/generated/**, .custom-radar, .custom-radar/**
- Max files: 200
- Max file size KB: 64
- Config warnings: none

## Safe Constraints

- Maintain exactly one status file named `STATUS.md` in the project root.
- Do not expose secret values from env files or inline credentials.
- Run tests before reporting completion.
- Update README when behavior changes.
- Respect the existing structure before proposing large rewrites.
- Use detected scripts and config files as the primary source of truth.
