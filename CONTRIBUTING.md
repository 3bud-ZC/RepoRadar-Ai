# Contributing

## Setup

```bash
npm install
npm run typecheck
npm run build
npm test
```

## Test Commands

```bash
npm run typecheck
npm run build
npm test
npm run validate
npm run pack:dry-run
```

Refresh the checked-in demo outputs with:

```bash
npm run examples:refresh
```

## Scanner Design Principles

- Keep the scanner deterministic and local-first.
- Prefer explainable heuristics over opaque AI behavior.
- Do not introduce cloud AI, local AI, dashboards, databases, or authentication into the current deterministic phases unless the user explicitly reopens that scope.
- Preserve valid JSON output for direct CLI usage such as `node dist/cli.js scan ./sample-project --json`.
- Avoid changes that make the scanner nondeterministic or dependent on network state.

## No Secret Exposure Rule

- Never commit real secrets.
- Never print `.env` values into generated outputs.
- If example artifacts are committed, sanitize any absolute local paths or sensitive values first.

## One STATUS.md Workflow

- There must be exactly one `STATUS.md` file.
- It must live in the project root.
- Do not create additional progress, handoff, or status files.
- Update the root `STATUS.md` as work meaningfully changes.

## How To Add Fixtures And Tests

- Put new deterministic fixtures under `fixtures/`.
- Keep fixtures small, purpose-built, and free of secrets.
- Prefer one fixture per behavior or heuristic family.
- Add or update Vitest coverage under `tests/`.
- Keep previous tests green when expanding scanner behavior.
- If a new CLI surface is added, add both happy-path and safety-path tests when practical.
