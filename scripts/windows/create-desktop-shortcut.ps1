#Requires -Version 5.1
<#
.SYNOPSIS
    Creates a Windows Desktop shortcut for RepoRadar AI Launcher.
.DESCRIPTION
    Creates a shortcut named "RepoRadar AI.lnk" on the Desktop that launches the interactive launcher.
.PARAMETER Force
    Overwrite an existing shortcut without confirmation.
#>

param(
    [switch]$Force
)

$ErrorActionPreference = "Stop"

# Resolve paths
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Resolve-Path (Join-Path $scriptDir "..\..") | Select-Object -ExpandProperty Path
$launcherPs1 = Join-Path $scriptDir "launch-reporadar.ps1"
$desktopPath = [Environment]::GetFolderPath("Desktop")
$shortcutPath = Join-Path $desktopPath "RepoRadar AI.lnk"

if (-not (Test-Path $launcherPs1)) {
    Write-Host "ERROR: Launcher script not found at $launcherPs1" -ForegroundColor Red
    exit 1
}

# Check existing
if ((Test-Path $shortcutPath) -and -not $Force) {
    Write-Host "Shortcut already exists at:" -ForegroundColor Yellow
    Write-Host "  $shortcutPath" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Use -Force to overwrite, or delete it manually."
    exit 1
}

# Create shortcut
$wshShell = New-Object -ComObject WScript.Shell
$shortcut = $wshShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = "powershell.exe"
$shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$launcherPs1`""
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = "Launch RepoRadar AI - Interactive repository scanner"
$shortcut.IconLocation = "powershell.exe,0"
$shortcut.Save()

Write-Host "RepoRadar AI Desktop shortcut created:" -ForegroundColor Green
Write-Host "  $shortcutPath" -ForegroundColor Green
Write-Host ""
Write-Host "Double-click it to launch the interactive folder picker and scanner."
