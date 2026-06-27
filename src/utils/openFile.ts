import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function sanitizeTarget(targetPath: string): string {
  const resolved = path.resolve(targetPath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Target does not exist: ${resolved}`);
  }
  return resolved;
}

export function openFileOrFolder(targetPath: string): void {
  const resolved = sanitizeTarget(targetPath);
  const platform = process.platform;

  if (platform === "win32") {
    spawn("explorer", [resolved], { detached: true, stdio: "ignore" });
  } else if (platform === "darwin") {
    spawn("open", [resolved], { detached: true, stdio: "ignore" });
  } else {
    spawn("xdg-open", [resolved], { detached: true, stdio: "ignore" });
  }
}

export function openInDefaultEditor(filePath: string): void {
  const resolved = sanitizeTarget(filePath);
  const platform = process.platform;

  if (platform === "win32") {
    spawn("start", ["", resolved], { detached: true, shell: true, stdio: "ignore" });
  } else if (platform === "darwin") {
    spawn("open", [resolved], { detached: true, stdio: "ignore" });
  } else {
    spawn("xdg-open", [resolved], { detached: true, stdio: "ignore" });
  }
}
