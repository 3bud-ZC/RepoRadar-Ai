# Project Report: Configured Fixture

## Executive Summary

- Configured Fixture was classified as a unknown.
- RepoRadar AI detected no major frameworks across 4 scanned files.
- The current deterministic health score is 25/100.

## Project Snapshot

| Key | Value |
| --- | --- |
| Project Name | Configured Fixture |
| Project Type | unknown |
| Package Manager | Not detected |
| Files Scanned | 4 |
| Skipped Files | 0 |
| Skipped Folders | 1 |
| Health Score | 25/100 |
| Monorepo | No |

## Config Summary

- Config detected: yes
- Config path: C:\Users\Abud\Desktop\GitHub\RepoRadar Ai\fixtures\config-custom-output\reporadar.config.json
- Output directory: .custom-radar
- Include patterns: src/**, package.json, README.md, reporadar.config.json
- Exclude patterns: src/generated/**, .custom-radar, .custom-radar/**
- Config warnings: none

## Scan Safety Summary

- Max files: 200
- Max file size: 64 KB
- Skipped files: 0
- Skipped folders: 1
- Truncated: no
- default ignored folder: 1

## Detected Stack

- None

## Monorepo Intelligence

- Monorepo: no
- Workspace manager: not detected
- Apps: none
- Packages: none
- Services: none
- Libraries: none

## Dependency Graph Summary

- Internal edges: 0
- External packages: 1
- Top external packages: node:http (1)
- High fan-in files: none
- High fan-out files: src/index.ts (1)
- Resolved 0 internal dependency edge(s).
- Detected 1 unique external package import(s).
- Cycle detection is limited to small resolvable mutual-import patterns.

## Architecture Risks

- None

## Deployment Readiness

- Deployment tools: none detected
- Deployment platforms: none detected
- Deployment docs present: no
- Health endpoint detected: no
- No deployment tooling was detected by the current heuristics.

## Health Score Breakdown

- Documentation: 8/20
- Structure: 0/20
- Security: 14/20
- Testing: 0/15
- Deployment readiness: 0/15
- AI-agent readiness: 3/10

## Top Reasons For Lost Points

- No automated tests were detected. (-10)
- No clear deployment target or Docker packaging was detected. (-7)
- No dedicated testing tool was detected. (-5)

## Key Issues

- No tests detected.
- No lint script found in package.json.
- No build script found in package.json.
- No root lockfile detected for dependency reproducibility.
- No major frameworks or tooling detected.
- Project type could not be confidently inferred.
- No deployment or CI signals were detected.

## Recommended Next Steps

1. Add smoke tests or unit tests to increase confidence in future scans.
2. Add .env.example to document required environment variables safely.
3. Commit a root lockfile to make dependency installs reproducible.
4. Add clearer scripts, docs, or config files so project type becomes easier to infer.
5. Add deployment config, CI workflows, or deployment docs to improve release readiness.
