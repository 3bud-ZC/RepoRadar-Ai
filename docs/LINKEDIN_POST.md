# LinkedIn Launch Posts

## Version 1 — Short Practical

I built a CLI tool that scans any codebase and generates architecture reports, tech-stack breakdowns, and AI-agent context in seconds.

No OpenAI key. No cloud. No database. 100% deterministic and local.

RepoRadar AI turns a folder of code into:
- `PROJECT_REPORT.md`
- `ARCHITECTURE.md`
- `TECH_STACK.md`
- `AI_AGENT_PROMPT.md`
- plus 5 more useful outputs

Perfect for:
- onboarding into unfamiliar repos
- portfolio case studies
- prepping context for AI agents

Try it:
```bash
git clone https://github.com/abud/reporadar-ai
cd reporadar-ai
npm install
npm run build
node dist/cli.js scan ./sample-project
```

Drop a comment if you want deeper framework detection or a new language supported.

#OpenSource #DeveloperTools #CLI #RepoRadarAI #CodeAnalysis

---

## Version 2 — Technical Builder

Every codebase has hidden structure. RepoRadar AI surfaces it without executing a single line of code.

What it does:
- Scans files and config to classify project type (frontend / backend / full-stack / CLI / library)
- Detects frameworks across JS/TS and Python ecosystems
- Resolves aliases from tsconfig, jsconfig, Vite, and webpack-style configs
- Maps routes, entrypoints, data models, and dependency graphs
- Scores repo health across documentation, structure, security, testing, deployment, and AI readiness
- Writes deterministic markdown reports you can diff in Git

Why no paid AI?
Because most repo intelligence is already in the files. Deterministic heuristics are faster, cheaper, and fully private. Optional AI layers can come later.

Outputs:
- `repo-facts.json` — structured scan data
- `PROJECT_REPORT.md` — high-level summary
- `ARCHITECTURE.md` — routes, layers, risks
- `TECH_STACK.md` — languages, frameworks, signals
- `SECURITY_NOTES.md` — security-oriented findings
- `AI_AGENT_PROMPT.md` — context for agent workflows
- `LINKEDIN_POST.md` and `PORTFOLIO_CASE_STUDY.md` — ready-to-use copy

Built with TypeScript + Commander. 42 tests. Zero vulnerabilities.

Repo: https://github.com/abud/reporadar-ai

If you are building dev tools or onboarding automation, this might save you hours.

#TypeScript #CLI #DevTools #StaticAnalysis #OpenSource #RepoRadarAI #Architecture

---

## Version 3 — Storytelling

Three months ago I joined a project with no README, no architecture doc, and a thousand files.

I spent two days just figuring out where things lived.

That pain became RepoRadar AI.

Now, in under 5 seconds, I can point it at any repo and get:
- a project health score
- detected frameworks and entrypoints
- a route map and data model list
- a dependency graph summary
- ready-to-share markdown reports

No cloud AI. No API keys. No surprises.

It runs entirely on your machine because your code should stay yours.

I open-sourced it so the next developer doesn't lose two days.

Clone it. Scan your repo. See what you have been missing.

https://github.com/abud/reporadar-ai

If this resonates, share it with someone who just inherited a messy codebase.

#DeveloperExperience #OpenSource #Codebase #Onboarding #DevTools #RepoRadarAI #BuildInPublic
