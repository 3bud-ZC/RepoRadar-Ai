export type ProjectType =
  | "frontend-app"
  | "backend-api"
  | "full-stack-app"
  | "cli-tool"
  | "library-package"
  | "unknown";

export interface Metadata {
  scannedAt: string;
  projectName: string;
  rootPath: string;
  outputPath: string;
  totalFilesScanned: number;
  mainFolders: string[];
  importantConfigFiles: string[];
  generatedFiles: string[];
}

export interface ResolvedReportSelection {
  project: boolean;
  architecture: boolean;
  techStack: boolean;
  security: boolean;
  readme: boolean;
  agentPrompt: boolean;
  linkedin: boolean;
  portfolio: boolean;
  fixPlan: boolean;
  quickWins: boolean;
  githubIssues: boolean;
  agentFixPrompt: boolean;
}

export type ImprovementCategory =
  | "security"
  | "documentation"
  | "testing"
  | "deployment"
  | "architecture"
  | "health-check"
  | "ci"
  | "monorepo"
  | "dependency-graph"
  | "environment"
  | "package-quality"
  | "developer-experience";

export type ImprovementEffort = "low" | "medium" | "high";
export type ImprovementImpact = "low" | "medium" | "high";
export type ImprovementSeverity = "critical" | "warning" | "info";

export interface ImprovementItem {
  id: string;
  title: string;
  category: ImprovementCategory;
  severity: ImprovementSeverity;
  effort: ImprovementEffort;
  impact: ImprovementImpact;
  source: string;
  problem: string;
  recommendedFix: string;
  acceptanceCriteria: string[];
  suggestedFiles: string[];
  relatedFacts: string[];
  safeForAgent: boolean;
}

export interface RepoConfigInfo {
  configDetected: boolean;
  configPath: string | null;
  configWarnings: string[];
  appliedIncludePatterns: string[];
  appliedExcludePatterns: string[];
  outputDir: string;
  maxFiles: number;
  maxFileSizeKb: number;
  reports: ResolvedReportSelection;
}

export interface SkippedReasonSummary {
  reason: string;
  count: number;
}

export interface ScanSafetyInfo {
  maxFiles: number;
  maxFileSizeKb: number;
  skippedFiles: number;
  skippedFolders: number;
  skippedReasons: SkippedReasonSummary[];
  truncated: boolean;
}

export interface LanguageStat {
  name: string;
  fileCount: number;
}

export interface MonorepoInfo {
  isMonorepo: boolean;
  workspaceManager: string | null;
  workspaceGlobs: string[];
  detectedApps: string[];
  detectedPackages: string[];
  detectedServices: string[];
  detectedLibraries: string[];
  monorepoTools: string[];
  monorepoNotes: string[];
  packageGraph: MonorepoPackageGraph | null;
}

export interface PythonEcosystemInfo {
  detected: boolean;
  packageFiles: string[];
  dependencyFiles: string[];
  frameworks: string[];
  testingTools: string[];
  usesSrcLayout: boolean;
  hasPytestConfig: boolean;
}

export interface EcosystemsInfo {
  primary: string[];
  python: PythonEcosystemInfo;
}

export interface DeploymentInfo {
  tools: string[];
  configFiles: string[];
  platforms: string[];
  hasDockerfile: boolean;
  hasDockerCompose: boolean;
  hasDockerIgnore: boolean;
  hasNginxConfig: boolean;
  hasPm2Config: boolean;
  notes: string[];
}

export interface CiInfo {
  providers: string[];
  workflowFiles: string[];
}

export interface PackageSummary {
  hasRootPackageJson: boolean;
  hasRootPyprojectToml: boolean;
  hasRequirementsTxt: boolean;
  hasSetupPy: boolean;
  hasSetupCfg: boolean;
  hasPipfile: boolean;
  hasPoetryLock: boolean;
  hasRootLockfile: boolean;
  workspacePackageCount: number;
  appCount: number;
  packageCount: number;
  serviceCount: number;
  libraryCount: number;
  hasSharedConfigPackage: boolean;
}

export interface ArchitectureEntrypoint {
  file: string;
  kind: string;
  reason: string;
  confidence: number;
}

export interface ArchitectureRoute {
  method: string | null;
  path: string;
  file: string;
  source: string;
  confidence: number;
}

export interface ArchitectureImport {
  file: string;
  target: string;
  kind: "import" | "require" | "export-from" | "python-import" | "python-from-import";
  internal: boolean;
  resolvedTarget?: string;
  resolutionKind?: "relative" | "alias" | "baseUrl" | "root" | "python-relative" | "python-module";
}

export interface ArchitectureLayer {
  name:
  | "frontend"
  | "backend"
  | "api"
  | "database"
  | "cli"
  | "shared"
  | "config"
  | "tests"
  | "docs"
  | "deployment"
  | "scripts"
  | "workers"
  | "unknown";
  files: string[];
}

export interface ArchitectureDataModel {
  name: string;
  source: string;
  file: string;
  confidence: number;
}

export interface ModuleAlias {
  pattern: string;
  targets: string[];
  source: string;
}

export interface ModuleBasePath {
  path: string;
  source: string;
}

export interface ModuleResolutionInfo {
  aliases: ModuleAlias[];
  basePaths: ModuleBasePath[];
  configFiles: string[];
  resolvedInternalImports: number;
  unresolvedInternalImports: number;
  aliasResolvedImports: number;
  relativeResolvedImports: number;
  baseUrlResolvedImports: number;
  notes: string[];
}

export interface ArchitectureEnvUsage {
  name: string;
  file: string;
  source: string;
}

export interface ArchitecturePackageRelationship {
  fromPackage: string;
  toPackage: string;
  sourcePackage: string;
  targetPackage: string;
  sourcePath: string;
  targetPath: string;
  file: string;
  importCount: number;
  confidence: number;
}

export interface MonorepoSharedPackageUsage {
  packageName: string;
  usedBy: string[];
}

export interface MonorepoPackageGraph {
  relationships: ArchitecturePackageRelationship[];
  orphanPackages: string[];
  sharedPackages: MonorepoSharedPackageUsage[];
}

export interface ArchitectureImportantFile {
  file: string;
  score: number;
  reasons: string[];
}

export interface DependencyGraphEdge {
  from: string;
  to: string;
  kind: string;
}

export interface DependencyGraphPackageCount {
  packageName: string;
  count: number;
}

export interface DependencyGraphFileCount {
  file: string;
  count: number;
}

export interface DependencyGraphCycleHint {
  files: string[];
  note: string;
}

export interface DependencyGraphInfo {
  internalEdges: DependencyGraphEdge[];
  externalPackages: string[];
  topImportedExternalPackages: DependencyGraphPackageCount[];
  topImportedInternalFiles: DependencyGraphFileCount[];
  highFanInFiles: DependencyGraphFileCount[];
  highFanOutFiles: DependencyGraphFileCount[];
  possibleCycles: DependencyGraphCycleHint[];
  notes: string[];
}

export interface ArchitectureInfo {
  entrypoints: ArchitectureEntrypoint[];
  routes: ArchitectureRoute[];
  imports: ArchitectureImport[];
  moduleResolution: ModuleResolutionInfo;
  layers: ArchitectureLayer[];
  dataModels: ArchitectureDataModel[];
  envUsage: ArchitectureEnvUsage[];
  packageRelationships: ArchitecturePackageRelationship[];
  importantFiles: ArchitectureImportantFile[];
  architectureStyle: string;
  notes: string[];
}

export interface ArchitectureRisk {
  severity: "critical" | "warning" | "info";
  title: string;
  detail: string;
  suggestedFix: string;
}

export interface QualitySignals {
  hasReadme: boolean;
  hasLicense: boolean;
  hasEnvExample: boolean;
  hasTests: boolean;
  hasTypeScriptConfig: boolean;
  hasLintScript: boolean;
  hasBuildScript: boolean;
  hasStartScript: boolean;
  hasDevScript: boolean;
  hasDockerfile: boolean;
  hasDeploymentDocs: boolean;
  hasCiWorkflow: boolean;
  hasWorkspaceConfig: boolean;
  hasRootLockfile: boolean;
}

export interface SecretFinding {
  file: string;
  line: number;
  pattern: string;
}

export interface SecuritySignals {
  envFilesDetected: string[];
  envIgnoredInGitignore: boolean;
  envRiskWarning: boolean;
  possibleHardcodedSecrets: SecretFinding[];
}

export interface HealthBreakdown {
  documentation: number;
  structure: number;
  security: number;
  testing: number;
  deploymentReadiness: number;
  aiReadiness: number;
}

export interface ScorePenalty {
  category: keyof HealthBreakdown;
  pointsLost: number;
  reason: string;
  recommendedFix: string;
}

export interface HealthDetails {
  maxScore: number;
  categoryMaxScores: HealthBreakdown;
  penalties: ScorePenalty[];
}

export interface RepoFacts {
  metadata: Metadata;
  config: RepoConfigInfo;
  scanSafety: ScanSafetyInfo;
  detectedLanguages: LanguageStat[];
  detectedFrameworks: string[];
  packageManager: string | null;
  projectType: ProjectType;
  monorepo: MonorepoInfo;
  ecosystems: EcosystemsInfo;
  deployment: DeploymentInfo;
  ci: CiInfo;
  packageSummary: PackageSummary;
  architecture: ArchitectureInfo;
  dependencyGraph: DependencyGraphInfo;
  architectureRisks: ArchitectureRisk[];
  hasHealthEndpoint: boolean;
  detectedHealthRoutes: string[];
  qualitySignals: QualitySignals;
  securitySignals: SecuritySignals;
  healthScore: number;
  healthBreakdown: HealthBreakdown;
  healthDetails: HealthDetails;
  issues: string[];
  recommendedNextSteps: string[];
  improvementItems: ImprovementItem[];
}

export interface ScanContext {
  rootPath: string;
  projectName: string;
  outputPath: string;
  config: RepoConfigInfo;
  scanSafety: ScanSafetyInfo;
  allFiles: string[];
  relativeFiles: string[];
  mainFolders: string[];
  importantConfigFiles: string[];
  packageJson: PackageJsonLike | null;
  fileContentCache: Map<string, string>;
}

export interface ScanOptions {
  outputDir?: string;
  configPath?: string;
}

export interface PackageJsonLike {
  name?: string;
  private?: boolean;
  main?: string;
  module?: string;
  bin?: string | Record<string, string>;
  workspaces?: string[] | { packages?: string[] };
  scripts?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface RepoRadarConfigReports {
  project?: boolean;
  architecture?: boolean;
  techStack?: boolean;
  security?: boolean;
  readme?: boolean;
  agentPrompt?: boolean;
  linkedin?: boolean;
  portfolio?: boolean;
  fixPlan?: boolean;
  quickWins?: boolean;
  githubIssues?: boolean;
  agentFixPrompt?: boolean;
}

export interface RepoRadarConfig {
  projectName?: string;
  include?: string[];
  exclude?: string[];
  maxFiles?: number;
  maxFileSizeKb?: number;
  reports?: RepoRadarConfigReports;
  outputDir?: string;
}
