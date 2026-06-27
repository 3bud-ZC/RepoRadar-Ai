import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const FIXTURES_ROOT = path.resolve(__dirname, "../../fixtures");

export function copyFixture(fixtureName: string): string {
  const sourcePath = path.join(FIXTURES_ROOT, fixtureName);
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "reporadar-fixture-"));
  const targetPath = path.join(tempRoot, fixtureName);
  fs.cpSync(sourcePath, targetPath, { recursive: true });
  return targetPath;
}

export function cleanupFixture(targetPath: string): void {
  const tempRoot = path.dirname(targetPath);
  fs.rmSync(tempRoot, { recursive: true, force: true });
}

