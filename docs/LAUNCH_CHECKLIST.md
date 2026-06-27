# Launch Checklist

## Pre-Launch Local Validation

Run these commands in the project root and confirm they all pass:

```bash
npm install
npm audit
npm run typecheck
npm run build
npm test
npm run validate
node dist/cli.js --help
node dist/cli.js --version
node dist/cli.js scan ./sample-project
node dist/cli.js scan ./sample-project --json
node dist/cli.js launch
npm run pack:dry-run
```

- [ ] `npm audit` returns 0 vulnerabilities
- [ ] `npm test` passes all suites (63 tests)
- [ ] `npm run validate` completes without errors
- [ ] CLI `--help` and `--version` print expected output
- [ ] Scan on `./sample-project` generates 13 files in `.reporadar/`
- [ ] `--json` emits valid JSON to stdout
- [ ] `npm run pack:dry-run` shows expected tarball contents

## GitHub Repo Setup

- [ ] Create repository at `https://github.com/abud/reporadar-ai`
- [ ] Push all code (do not push `node_modules/`, `dist/`, `.env`, or `coverage/`)
- [ ] Add GitHub topics: `cli`, `developer-tools`, `repository-scanner`, `static-analysis`, `architecture`, `typescript`, `code-analysis`, `repo-health`
- [ ] Enable Issues tab
- [ ] Enable Discussions tab (optional)
- [ ] Set default branch to `main`
- [ ] Add a one-sentence repo description
- [ ] Add a website link (can point to README anchor or personal site)

## README Screenshot/GIF Checklist

- [ ] Record terminal running `node dist/cli.js scan ./sample-project`
- [ ] Scroll through generated `PROJECT_REPORT.md`
- [ ] Scroll through generated `ARCHITECTURE.md`
- [ ] Save GIF as `docs/demo.gif` (recommended 30-45 seconds, 800px wide)
- [ ] Update README `![Demo GIF placeholder](docs/demo.gif)` to show real asset
- [ ] Ensure GIF does not contain local absolute paths, secrets, or private info

## Release Checklist

- [ ] Version in `package.json` and `dist/cli.js --version` match
- [ ] `CHANGELOG.md` reflects current version
- [ ] `LICENSE` file exists (MIT)
- [ ] `CONTRIBUTING.md` is up to date
- [ ] All example outputs are refreshed (`npm run examples:refresh`)
- [ ] No `.env` files committed except intentional fixtures
- [ ] No secrets in repo history
- [ ] `.gitignore` covers `node_modules/`, `dist/`, `coverage/`, `.env`, `*.log`
- [ ] GitHub Release drafted with notes from `docs/GITHUB_RELEASE_NOTES.md`

## Post-Launch

- [ ] Verify GitHub Release renders correctly
- [ ] Post launch announcement on LinkedIn (see `docs/LINKEDIN_POST.md`)
- [ ] Monitor first issues for typos or broken links
- [ ] Star and watch the repo for community signals
