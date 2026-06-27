# Desktop Launcher Guide

## What Is the Launcher?

The RepoRadar AI Desktop Launcher is an interactive terminal experience that lets you:

1. Pick a project folder (via Windows folder picker or manual path entry)
2. Run a scan without typing long CLI commands
3. View the scan summary
4. Open generated reports directly from the terminal menu

It is deterministic, local-first, and requires no AI keys or cloud services.

## Windows Shortcut Setup

### Step 1: Build the project

```bash
npm install
npm run build
```

### Step 2: Create the Desktop shortcut

```bash
npm run shortcut:windows
```

This creates `RepoRadar AI.lnk` on your Windows Desktop.

### Step 3: Launch from Desktop

Double-click the shortcut. It opens a terminal and starts the interactive launcher.

### Overwrite an Existing Shortcut

If you already have a shortcut and want to replace it:

```bash
npm run shortcut:windows -- --Force
```

Or delete the old shortcut manually and rerun the command.

## Manual Launcher Usage

You can run the launcher directly from the terminal on any platform:

```bash
node dist/cli.js launch
```

Or use the npm script:

```bash
npm run launcher
```

On Windows you can also use:

```bash
npm run launcher:windows
```

## Folder Picker Behavior

- **Windows**: Uses the native `System.Windows.Forms.FolderBrowserDialog`
  - If the dialog is cancelled or fails, the launcher falls back to manual path entry automatically.
- **macOS/Linux**: The folder picker is not available; the launcher asks you to type the path directly.

## Output Folder Behavior

The scan writes outputs into `<selected-project>/.reporadar/` by default. After scanning, the post-scan menu lets you:

- Open the output folder in your file manager
- Open `PROJECT_REPORT.md` in your default editor
- Open `ARCHITECTURE.md` in your default editor
- Open `AI_AGENT_PROMPT.md` in your default editor

## Troubleshooting

### "Build output not found" when using the shortcut

The PowerShell launcher automatically runs `npm run build` if `dist/cli.js` is missing. If this fails, run `npm install && npm run build` manually in the project root first.

### Folder picker does not appear

- The PowerShell folder picker requires Windows with .NET Framework (available on all modern Windows versions).
- If it fails silently, the launcher falls back to asking you to type the path.
- You can also skip the picker and choose option `2` (manual path entry) from the start.

### Shortcut already exists

Use the `-Force` flag on the shortcut creation script, or delete the existing `.lnk` file manually.

### Reports do not open

The launcher uses platform-specific commands to open files:
- Windows: `start` (via `explorer` for folders)
- macOS: `open`
- Linux: `xdg-open`

If your system does not have these commands, the launcher will print the file paths so you can open them manually.

## How to Remove the Shortcut

Delete the file from your Desktop:

```powershell
Remove-Item "$env:USERPROFILE\Desktop\RepoRadar AI.lnk"
```

Or right-click it and choose Delete.

## Limitations

- The Windows folder picker is only available when running on Windows with PowerShell.
- The interactive menu requires a terminal with stdin support. It will not work in non-interactive environments like CI pipelines.
- Opening files uses the OS default application. If no default application is set for `.md` files, the OS may prompt you to choose one.
