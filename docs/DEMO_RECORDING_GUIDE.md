# Demo Recording Guide

## Terminal Commands To Run

Open a terminal in the project root and run these commands in order:

```bash
npm install
npm run build
node dist/cli.js --version
node dist/cli.js scan ./sample-project
node dist/cli.js scan ./sample-project --json
```

## What To Show In The README Demo

1. **Install and build** — type `npm install` and `npm run build`
2. **Scan** — type `node dist/cli.js scan ./sample-project`
3. **Human output** — show the summary lines (project type, frameworks, health score, generated files)
4. **Generated files** — list the `.reporadar/` directory contents
5. **Open reports** — open `PROJECT_REPORT.md` and scroll through the summary
6. **Open architecture** — open `ARCHITECTURE.md` and scroll through entrypoints, routes, layers, risks
7. **Open AI agent prompt** — open `AI_AGENT_PROMPT.md` and scroll through the context block
8. **Open FIX_PLAN.md** — show prioritized improvement items
9. **Open QUICK_WINS.md** — show low-effort, high-impact fixes
10. **JSON output** — run `node dist/cli.js scan ./sample-project --json` and show the first 20 lines

## Suggested GIF Flow (30-45 seconds)

- **0-5s**: Terminal showing `node dist/cli.js scan ./sample-project`
- **5-15s**: Scan running, human summary printing
- **15-25s**: Open `PROJECT_REPORT.md` in editor, scroll
- **25-35s**: Open `ARCHITECTURE.md` in editor, scroll
- **35-45s**: Open `AI_AGENT_PROMPT.md`, then run `--json` command

## Suggested LinkedIn Video Structure (30-45 seconds)

1. **Hook (0-5s)**: "This tool scans any repo in 5 seconds."
2. **Demo (5-20s)**: Run scan on sample-project, show generated files
3. **Proof (20-30s)**: Open `ARCHITECTURE.md` and `AI_AGENT_PROMPT.md`
4. **CTA (30-45s)**: "Clone it, scan your repo, tell me what it missed. Link in comments."

## Capture Tips

- Use a clean terminal theme with good contrast
- Keep font size readable (14-16pt)
- Resize terminal to ~100 columns so lines do not wrap
- Hide personal prompts if they contain machine names or paths
- Sanitize any accidental absolute paths in output before sharing
