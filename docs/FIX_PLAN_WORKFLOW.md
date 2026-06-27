# Fix Plan Workflow

## Overview

RepoRadar AI now generates actionable improvement outputs after every scan. This guide explains how to use them.

## How to Scan a Project

```bash
npm install
npm run build
node dist/cli.js scan ./my-project
```

The scan creates a `.reporadar/` folder inside the scanned project with:

- `repo-facts.json` — raw structured data
- `PROJECT_REPORT.md` — full project overview
- `ARCHITECTURE.md` — architecture analysis
- `FIX_PLAN.md` — prioritized improvement plan
- `QUICK_WINS.md` — low-effort fixes
- `GITHUB_ISSUES.md` — copy-paste ready GitHub issues
- `AGENT_FIX_PROMPT.md` — prompt for AI coding agents

## How to Open FIX_PLAN.md

After scanning, open:

```bash
# macOS
open ./my-project/.reporadar/FIX_PLAN.md

# Linux
xdg-open ./my-project/.reporadar/FIX_PLAN.md

# Windows
start ./my-project/.reporadar/FIX_PLAN.md
```

Or use the interactive launcher:

```bash
node dist/cli.js launch
```

Then choose option `5` after the scan completes.

## How to Create GitHub Issues Manually

1. Open `GITHUB_ISSUES.md` from the `.reporadar/` output folder.
2. Copy one issue block at a time.
3. Paste it into a new GitHub issue.
4. Adjust labels to match your repository's label conventions.
5. Submit.

Each issue includes:
- Title and labels
- Problem description
- Recommended fix
- Acceptance criteria (checkboxes)
- Suggested files to inspect

## How to Use AGENT_FIX_PROMPT.md with an AI Coding Agent

1. Open `AGENT_FIX_PROMPT.md`.
2. Copy the entire prompt.
3. Paste it into your AI coding agent (Claude, ChatGPT, Cursor, etc.).
4. The agent receives:
   - Project summary (type, stack, health score)
   - Top improvement items
   - Strict safety constraints
   - Exact task list and validation commands

**Important:** The prompt explicitly tells the agent:
- Do not expose secrets
- Do not overwrite user work without reading files first
- Maintain exactly one STATUS.md if the project uses a status workflow
- Run tests/build before reporting completion
- Do not invent environment variable values

## Safety Notes

- RepoRadar AI **never** modifies the scanned project automatically.
- All fix suggestions are advisory. You decide which ones to apply.
- Items marked "Safe for agent: Yes" in FIX_PLAN.md are suitable for automation.
- Items marked "Review manually first" require human judgment before automation.
- Always review AI-generated changes before committing them.

## Disabling Specific Reports

Add this to `reporadar.config.json` to disable any output:

```json
{
  "reports": {
    "fixPlan": false,
    "quickWins": false,
    "githubIssues": false,
    "agentFixPrompt": false
  }
}
```

All report toggles default to `true`.
