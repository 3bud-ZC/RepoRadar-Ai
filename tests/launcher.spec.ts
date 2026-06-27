import fs from "node:fs";
import path from "node:path";
import { describe, expect, it, vi } from "vitest";
import { runCli } from "../src/cli";

describe("phase 3B launcher", () => {
  it("includes launch command in help output", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => undefined);

    await runCli(["node", "reporadar", "--help"]);
    const helpOutput = logSpy.mock.calls.map((call) => String(call[0])).join("\n");
    expect(helpOutput).toContain("launch");
    expect(helpOutput).toContain("Interactive launcher");

    logSpy.mockRestore();
  });

  it("has launcher npm script in package.json", () => {
    const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8")) as {
      scripts: Record<string, string>;
    };
    expect(pkg.scripts.launcher).toBeDefined();
    expect(pkg.scripts["shortcut:windows"]).toBeDefined();
    expect(pkg.scripts["launcher:windows"]).toBeDefined();
  });

  it("has Windows launcher scripts on disk", () => {
    const scriptsDir = path.resolve("scripts/windows");
    expect(fs.existsSync(path.join(scriptsDir, "launch-reporadar.ps1"))).toBe(true);
    expect(fs.existsSync(path.join(scriptsDir, "create-desktop-shortcut.ps1"))).toBe(true);
    expect(fs.existsSync(path.join(scriptsDir, "launch-reporadar.cmd"))).toBe(true);
  });

  it("has desktop launcher documentation", () => {
    expect(fs.existsSync(path.resolve("docs/DESKTOP_LAUNCHER.md"))).toBe(true);
    const content = fs.readFileSync(path.resolve("docs/DESKTOP_LAUNCHER.md"), "utf8");
    expect(content).toContain("RepoRadar AI");
    expect(content).toContain("Windows");
    expect(content).toContain("shortcut");
  });

  it("has openFile utility for safe cross-platform opening", () => {
    expect(fs.existsSync(path.resolve("src/utils/openFile.ts"))).toBe(true);
    const content = fs.readFileSync(path.resolve("src/utils/openFile.ts"), "utf8");
    expect(content).toContain("openFileOrFolder");
    expect(content).toContain("sanitizeTarget");
    expect(content).toContain("win32");
    expect(content).toContain("darwin");
    expect(content).toContain("xdg-open");
  });

  it("has launcher utility with runLauncher export", () => {
    expect(fs.existsSync(path.resolve("src/utils/launcher.ts"))).toBe(true);
    const content = fs.readFileSync(path.resolve("src/utils/launcher.ts"), "utf8");
    expect(content).toContain("export function runLauncher");
    expect(content).toContain("scanProject");
    expect(content).toContain("openFileOrFolder");
  });

  it("does not create extra STATUS files", () => {
    const root = path.resolve(".");
    const statusFiles = fs.readdirSync(root).filter((f) => f.toLowerCase().includes("status") && f.endsWith(".md"));
    expect(statusFiles).toEqual(["STATUS.md"]);
  });
});
