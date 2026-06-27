import type { CiInfo, DeploymentInfo, ScanContext } from "../types/repoFacts";

function hasAny(context: ScanContext, fileNames: string[]): boolean {
  const files = new Set(context.relativeFiles);
  return fileNames.some((fileName) => files.has(fileName));
}

export function detectCi(context: ScanContext): CiInfo {
  const workflowFiles = context.relativeFiles.filter((file) => file.startsWith(".github/workflows/")).sort();
  const providers = workflowFiles.length > 0 ? ["GitHub Actions"] : [];

  return {
    providers,
    workflowFiles,
  };
}

export function detectDeployment(context: ScanContext): DeploymentInfo {
  const configFiles = [
    "Dockerfile",
    "docker-compose.yml",
    "docker-compose.yaml",
    ".dockerignore",
    "vercel.json",
    "netlify.toml",
    "render.yaml",
    "render.yml",
    "railway.json",
    "railway.toml",
    "pm2.config.js",
    "ecosystem.config.js",
    "ecosystem.config.cjs",
    ...context.relativeFiles.filter((file) => file.startsWith(".github/workflows/")),
    ...context.relativeFiles.filter((file) => file.endsWith("nginx.conf") || file === "nginx.conf"),
  ].filter((fileName, index, all) => context.relativeFiles.includes(fileName) && all.indexOf(fileName) === index);

  const hasDockerfile = context.relativeFiles.includes("Dockerfile");
  const hasDockerCompose = hasAny(context, ["docker-compose.yml", "docker-compose.yaml"]);
  const hasDockerIgnore = context.relativeFiles.includes(".dockerignore");
  const hasNginxConfig = context.relativeFiles.some((file) => file.endsWith("nginx.conf") || file === "nginx.conf");
  const hasPm2Config = hasAny(context, ["pm2.config.js", "ecosystem.config.js", "ecosystem.config.cjs"]);
  const hasGithubActions = context.relativeFiles.some((file) => file.startsWith(".github/workflows/"));

  const tools = [
    hasDockerfile ? "Docker" : null,
    hasDockerCompose ? "Docker Compose" : null,
    hasPm2Config ? "PM2" : null,
    hasGithubActions ? "GitHub Actions" : null,
    hasNginxConfig ? "Nginx" : null,
  ].filter((tool): tool is string => tool !== null);

  const platforms = [
    context.relativeFiles.includes("vercel.json") ? "Vercel" : null,
    context.relativeFiles.includes("netlify.toml") ? "Netlify" : null,
    context.relativeFiles.includes("render.yaml") || context.relativeFiles.includes("render.yml") ? "Render" : null,
    context.relativeFiles.includes("railway.json") || context.relativeFiles.includes("railway.toml") ? "Railway" : null,
  ].filter((platform): platform is string => platform !== null);

  const notes: string[] = [];
  if (hasDockerfile) notes.push("Docker packaging is present.");
  if (hasDockerCompose) notes.push("Container orchestration hints were detected through docker-compose.");
  if (hasGithubActions) notes.push("CI workflows were detected in .github/workflows.");
  if (platforms.length > 0) notes.push(`Detected deployment platforms: ${platforms.join(", ")}.`);
  if (notes.length === 0) notes.push("No deployment tooling was detected by the current heuristics.");

  return {
    tools,
    configFiles: configFiles.sort(),
    platforms,
    hasDockerfile,
    hasDockerCompose,
    hasDockerIgnore,
    hasNginxConfig,
    hasPm2Config,
    notes,
  };
}
