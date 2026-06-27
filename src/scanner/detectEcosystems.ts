import type { EcosystemsInfo, PythonEcosystemInfo, ScanContext } from "../types/repoFacts";

function hasFile(relativeFiles: string[], name: string): boolean {
  return relativeFiles.includes(name);
}

function fileOrContentMatch(context: ScanContext, predicate: (relativePath: string, content: string) => boolean): boolean {
  for (const [relativePath, content] of context.fileContentCache.entries()) {
    if (predicate(relativePath, content)) {
      return true;
    }
  }

  return false;
}

function detectPythonInfo(context: ScanContext): PythonEcosystemInfo {
  const packageFiles = ["pyproject.toml", "setup.py", "setup.cfg"].filter((file) => hasFile(context.relativeFiles, file));
  const dependencyFiles = ["requirements.txt", "poetry.lock", "Pipfile", "Pipfile.lock"].filter((file) =>
    hasFile(context.relativeFiles, file),
  );
  const hasPytestConfig =
    hasFile(context.relativeFiles, "pytest.ini") ||
    hasFile(context.relativeFiles, "tox.ini") ||
    fileOrContentMatch(context, (relativePath, content) => relativePath === "pyproject.toml" && content.includes("[tool.pytest"));

  const frameworks = [
    fileOrContentMatch(context, (_relativePath, content) => content.includes("fastapi") || content.includes("from fastapi import"))
      ? "FastAPI"
      : null,
    fileOrContentMatch(context, (_relativePath, content) => content.includes("flask") || content.includes("from flask import"))
      ? "Flask"
      : null,
    fileOrContentMatch(context, (_relativePath, content) => content.includes("django") || content.includes("DJANGO_SETTINGS_MODULE") || content.includes("from django"))
      ? "Django"
      : null,
    fileOrContentMatch(context, (_relativePath, content) => content.includes("streamlit"))
      ? "Streamlit"
      : null,
    fileOrContentMatch(context, (_relativePath, content) => content.includes("import typer") || content.includes("from typer import"))
      ? "Typer"
      : null,
    fileOrContentMatch(context, (_relativePath, content) => content.includes("import click") || content.includes("from click import"))
      ? "Click"
      : null,
  ].filter((framework): framework is string => framework !== null);

  const testingTools = [
    hasPytestConfig || fileOrContentMatch(context, (_relativePath, content) => content.includes("pytest")) ? "Pytest" : null,
  ].filter((tool): tool is string => tool !== null);
  const usesSrcLayout = context.relativeFiles.some((file) => file.startsWith("src/"));
  const detected =
    context.relativeFiles.some((file) => file.endsWith(".py")) ||
    packageFiles.length > 0 ||
    dependencyFiles.length > 0;

  return {
    detected,
    packageFiles,
    dependencyFiles,
    frameworks: [...new Set(frameworks)].sort(),
    testingTools,
    usesSrcLayout,
    hasPytestConfig,
  };
}

export function detectEcosystems(context: ScanContext): EcosystemsInfo {
  const python = detectPythonInfo(context);
  const primary = [
    context.relativeFiles.includes("package.json") ? "Node.js" : null,
    python.detected ? "Python" : null,
  ].filter((ecosystem): ecosystem is string => ecosystem !== null);

  return {
    primary,
    python,
  };
}
