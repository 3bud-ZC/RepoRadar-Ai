@echo off
REM Fallback launcher for RepoRadar AI on Windows.
REM Calls the PowerShell launcher so the terminal stays open on errors.

cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0launch-reporadar.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo RepoRadar AI launcher exited with code %ERRORLEVEL%.
    echo.
    pause
)
