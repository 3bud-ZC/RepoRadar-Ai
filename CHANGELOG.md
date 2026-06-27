# Changelog

All notable changes to RepoRadar AI are tracked here.

## Unreleased

- Added abud.fun ownership and attribution: LICENSE, README Author & Ownership section, CLI help footer, generated report footer, package.json metadata updated.
- Phase 3B desktop shortcut and interactive launcher.

## Phase 3B

- Added `reporadar launch` interactive CLI command with Windows folder picker and manual path fallback
- Added post-scan menu to open output folder, PROJECT_REPORT.md, ARCHITECTURE.md, AI_AGENT_PROMPT.md
- Created `scripts/windows/launch-reporadar.ps1`, `create-desktop-shortcut.ps1`, `launch-reporadar.cmd`
- Added `src/utils/openFile.ts` for safe cross-platform file/folder opening
- Added `src/utils/launcher.ts` with `runLauncher()` for menu-driven terminal experience
- Added npm scripts: `launcher`, `shortcut:windows`, `launcher:windows`
- Updated README with Desktop Launcher section
- Created `docs/DESKTOP_LAUNCHER.md` with setup, usage, and troubleshooting guide
- Added `tests/launcher.spec.ts` with launcher feature tests

## Phase 3A

- Final repository cleanup and validation
- README polish with best demo command section and screenshot capture instructions
- Added `docs/LAUNCH_CHECKLIST.md`, `docs/LINKEDIN_POST.md`, `docs/GITHUB_RELEASE_NOTES.md`, `docs/DEMO_RECORDING_GUIDE.md`
- Added `scripts/demo-commands.md` for exact demo flows
- Refreshed example outputs to match current scanner behavior
- Finalized package metadata: MIT license, repository, bugs, homepage fields
- Added `docs/` to npm package files
- Full validation suite passed: install, audit, typecheck, build, test, validate, CLI help/version, scan, pack dry-run

## Phase 1

- Initial deterministic CLI foundation
- Core repo scanning and markdown output generation
- MVP project classification and report generation

## Phase 2A

- Reliability improvements and baseline automated tests
- Stronger repeatability for local deterministic scans

## Phase 2B

- Monorepo detection improvements
- Broader Python and deployment signal support

## Phase 2C

- Architecture intelligence for entrypoints, routes, imports, layers, data models, and environment-variable detection

## Phase 2D

- `reporadar.config.json` support
- Scan safety metadata and skipped-file reporting
- Dependency graph summaries
- Architecture risks and health endpoint detection

## Phase 2E

- Alias-aware dependency resolution
- Broader JS/TS and Python framework coverage
- Expanded route and model detection
- Improved architecture-style classification
- CLI, report, and package polish for the deterministic scanner

## Phase 2F

- CLI UX upgrades with `--output`, `--config`, and `init`
- GitHub-ready README and demo-focused docs
- Checked-in example outputs for `sample-project`
- Added `CHANGELOG.md` and `CONTRIBUTING.md`
- Added package validation scripts including `validate` and `pack:dry-run`
- Added release-readiness tests and npm pack dry-run validation
