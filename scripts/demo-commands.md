# Demo Commands

Use these exact commands for README demos, screen recordings, and live presentations.

## Install And Build

```bash
npm install
npm run build
```

## Best Demo Command

```bash
node dist/cli.js scan ./sample-project
```

## JSON Demo Command

```bash
node dist/cli.js scan ./sample-project --json
```

## Full Validation Suite

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
npm run pack:dry-run
```

## Config And Init Demo

```bash
node dist/cli.js init
node dist/cli.js scan ./sample-project --config reporadar.config.json
node dist/cli.js scan ./sample-project --output custom-output
```

## Refresh Example Outputs

```bash
npm run examples:refresh
```
