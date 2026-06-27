#Requires -Version 5.1
<#
.SYNOPSIS
    Launches the RepoRadar AI interactive CLI launcher.
.DESCRIPTION
    Finds the RepoRadar AI project root relative to this script,
    ensures the project is built, and runs the launcher command.
#>

$ErrorActionPreference = "Stop"

# Resolve project root (two levels up from scripts/windows/)
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..\..") | Select-Object -ExpandProperty Path

if (-not (Test-Path (Join-Path $projectRoot "package.json"))) {
    Write-Host "ERROR: Could not locate RepoRadar AI project root." -ForegroundColor Red
    Write-Host "Expected package.json in: $projectRoot" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
    exit 1
}

Set-Location $projectRoot

# Check if dist exists
if (-not (Test-Path (Join-Path $projectRoot "dist\cli.js"))) {
    Write-Host "Build output not found. Running npm run build..." -ForegroundColor Yellow
    try {
        npm run build | Out-Host
    } catch {
        Write-Host "ERROR: Build failed." -ForegroundColor Red
        Write-Host ""
        Write-Host "Press any key to exit..."
        $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
        exit 1
    }
}

# Run launcher
Write-Host "Starting RepoRadar AI Launcher..." -ForegroundColor Cyan
Write-Host ""

& node "$projectRoot\dist\cli.js" launch

if ($LASTEXITCODE -ne 0) {
    Write-Host ""
    Write-Host "Launcher exited with code $LASTEXITCODE" -ForegroundColor Red
    Write-Host ""
    Write-Host "Press any key to exit..."
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
